import os
import re
import requests
import google.generativeai as genai
import base64
from typing import Dict, List, Tuple
from dateutil.parser import parse as parse_date


# GitHub API token for authentication
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
if not GITHUB_TOKEN:
    raise RuntimeError("GitHub token not found in environment variables")

HEADERS = {"Authorization": f"token {GITHUB_TOKEN}"}


def get_github_headers() -> Dict[str, str]:
    """Get headers for GitHub API requests with token authentication.
    
    Returns:
        dict: Headers including authorization token if available
    
    Raises:
        RuntimeError: If GitHub token is not found in environment
    """
    token = os.getenv("GITHUB_TOKEN")
    if not token:
        raise RuntimeError("GitHub token not found. Please set GITHUB_TOKEN in .env file")
    return {"Authorization": f"token {token}"}

def handle_github_error(response: requests.Response) -> None:
    """Handle GitHub API error responses.
    
    Args:
        response: The response object from the GitHub API
        
    Raises:
        RuntimeError with appropriate error message
    """
    if response.status_code == 404:
        raise RuntimeError("Repository not found")
    elif response.status_code == 401:
        raise RuntimeError("Invalid GitHub token or unauthorized access")
    elif response.status_code == 403:
        raise RuntimeError("API rate limit exceeded or access denied")
    else:
        try:
            error_msg = response.json().get('message', 'Unknown GitHub API error')
            raise RuntimeError(f"GitHub API error: {error_msg}")
        except ValueError:
            raise RuntimeError(f"GitHub API error: Status {response.status_code}")

def parse_github_url(url: str) -> Tuple[str, str]:
    """Extract owner and repository name from GitHub URL.
    
    Args:
        url (str): GitHub repository URL
        
    Returns:
        tuple: (owner, repo_name)
    """
    pattern = r'github\.com[:/](?P<owner>[^/]+)/(?P<repo>[^/]+)'
    match = re.search(pattern, url)
    if not match:
        raise ValueError(f"Invalid GitHub URL format: {url}")
    
    return match.group('owner'), match.group('repo')

def get_repo_metadata(owner: str, repo: str) -> Dict:
    """Fetch repository metadata.
    
    Args:
        owner (str): Repository owner
        repo (str): Repository name
        
    Returns:
        dict: Repository metadata including:
        - stars: Number of stars
        - forks: Number of forks
        - watchers: Number of watchers
        - created_at: Creation date
        - updated_at: Last update date
        - language: Primary language
        - languages: All languages used with percentages
        - size: Repository size in KB
        - default_branch: Default branch name
        - open_issues: Number of open issues
        - topics: Repository topics/tags
        - license: Repository license info
        - visibility: public/private status
        - archived: Whether repository is archived
        - branches: List of branches
        - branch_count: Number of branches
    """
    url = f"https://api.github.com/repos/{owner}/{repo}"
    response = requests.get(url, headers=get_github_headers())
    if not response.ok:
        handle_github_error(response)
    data = response.json()
    
    # Get all languages used in the repository
    languages_data = get_repo_languages(owner, repo)
    total_bytes = sum(languages_data.values()) if languages_data else 0
    
    # Calculate language percentages
    languages = {
        lang: {
            "bytes": bytes_count,
            "percentage": round((bytes_count / total_bytes) * 100, 2) if total_bytes > 0 else 0
        }
        for lang, bytes_count in languages_data.items()
    }
    
    # Get branches
    branches = get_repo_branches(owner, repo)
    default_branch = data.get("default_branch", "main")
    
    # Mark default branch
    for branch in branches:
        if branch["name"] == default_branch:
            branch["is_default"] = True
    
    return {
        "name": data.get("name"),
        "full_name": data.get("full_name"),
        "description": data.get("description"),
        "stars": data.get("stargazers_count", 0),
        "forks": data.get("forks_count", 0),
        "watchers": data.get("watchers_count", 0),
        "created_at": data.get("created_at"),
        "updated_at": data.get("updated_at"),
        "language": data.get("language"),
        "languages": languages,
        "size": data.get("size", 0),
        "default_branch": default_branch,
        "open_issues": data.get("open_issues_count", 0),
        "topics": data.get("topics", []),
        "license": data.get("license", {}).get("name") if data.get("license") else None,
        "visibility": data.get("visibility", "unknown"),
        "archived": data.get("archived", False),
        "branches": branches,
        "branch_count": len(branches)
    }

def get_repo_readme(owner: str, repo: str) -> Dict:
    """Fetch repository README content.
    
    Args:
        owner (str): Repository owner
        repo (str): Repository name
        
    Returns:
        dict: README content and metadata
    """
    url = f"https://api.github.com/repos/{owner}/{repo}/readme"
    response = requests.get(url, headers=get_github_headers())
    
    if response.status_code == 404:
        return {"content": None, "error": "README not found"}
    
    if not response.ok:
        handle_github_error(response)
    
    data = response.json()
    content = base64.b64decode(data["content"]).decode("utf-8")
    
    return {
        "content": content,
        "name": data["name"],
        "path": data["path"],
        "size": data["size"],
        "encoding": data["encoding"]
    }

def get_repo_languages(owner: str, repo: str) -> Dict[str, int]:
    """Fetch all programming languages used in the repository.
    
    Args:
        owner (str): Repository owner
        repo (str): Repository name
        
    Returns:
        dict: Language names mapped to byte counts
    """
    url = f"https://api.github.com/repos/{owner}/{repo}/languages"
    response = requests.get(url, headers=get_github_headers())
    if not response.ok:
        handle_github_error(response)
    return response.json()

def get_repo_branches(owner: str, repo: str) -> List[Dict]:
    """Fetch repository branches.
    
    Args:
        owner (str): Repository owner
        repo (str): Repository name
        
    Returns:
        list: Branch information
    """
    url = f"https://api.github.com/repos/{owner}/{repo}/branches"
    response = requests.get(url, headers=get_github_headers())
    
    if not response.ok:
        handle_github_error(response)
    
    branches = response.json()
    
    return [{
        "name": branch["name"],
        "is_default": False,  # Will be updated in get_repo_metadata
        "commit_sha": branch["commit"]["sha"]
    } for branch in branches]

def get_contributors(owner: str, repo: str, limit: int = 10) -> List[Dict]:
    """Fetch repository contributors from GitHub API.
    
    Args:
        owner (str): Repository owner
        repo (str): Repository name
        limit (int): Maximum number of contributors to return
        
    Returns:
        list: List of contributors with their contribution counts
    """
    url = f"https://api.github.com/repos/{owner}/{repo}/contributors"
    response = requests.get(url, params={"per_page": limit}, headers=get_github_headers())
    if not response.ok:
        handle_github_error(response)
    
    return [{
        "login": contributor["login"],
        "contributions": contributor["contributions"]
    } for contributor in response.json()[:limit]]

def get_commit_activity(owner: str, repo: str) -> List[Dict]:
    """Fetch weekly commit activity for the repository.
    
    Args:
        owner (str): Repository owner
        repo (str): Repository name
        
    Returns:
        list: Weekly commit counts for the last year
    """
    url = f"https://api.github.com/repos/{owner}/{repo}/stats/commit_activity"
    response = requests.get(url, headers=get_github_headers())
    if not response.ok:
        handle_github_error(response)
    
    # GitHub might return 202 while generating stats
    if response.status_code == 202:
        return []
        
    return [{
        "week": week["week"],
        "total": week["total"]
    } for week in response.json()]

def get_repo_releases(owner: str, repo: str) -> List[Dict]:
    """Fetch repository releases with pagination support.
    
    Args:
        owner (str): Repository owner
        repo (str): Repository name
        
    Returns:
        list: Release information including assets
    """
    url = f"https://api.github.com/repos/{owner}/{repo}/releases?per_page=100"
    all_releases = []
    
    while url:
        response = requests.get(url, headers=get_github_headers())
        
        if not response.ok:
            handle_github_error(response)
            
        all_releases.extend(response.json())
        
        # Get next page URL from Link header
        url = None
        link_header = response.headers.get('Link', '')
        
        if 'rel="next"' in link_header:
            for link in link_header.split(','):
                if 'rel="next"' in link:
                    url_part = link.split(';')[0].strip()
                    if url_part.startswith('<') and url_part.endswith('>'):
                        url = url_part[1:-1]
                    break
    
    # Process releases to extract asset information
    return [
        {
            "id": release["id"],
            "name": release["name"] or release["tag_name"],
            "tag_name": release["tag_name"],
            "published_at": release["published_at"],
            "body": release["body"],
            "assets": [
                {
                    "id": asset["id"],
                    "name": asset["name"],
                    "size": asset["size"],
                    "download_count": asset["download_count"],
                    "content_type": asset["content_type"],
                    "browser_download_url": asset["browser_download_url"]
                }
                for asset in release["assets"]
            ]
        }
        for release in all_releases
    ]

def generate_repo_summary(readme_content: str, repo_metadata: Dict = None) -> str:
    """Generate an AI summary of the repository using Gemini.
    
    Args:
        readme_content (str): Repository README content
        repo_metadata (Dict, optional): Repository metadata
        
    Returns:
        str: AI-generated summary
    """
    if not readme_content:
        return "No README content available for summary"
    
    prompt = """You are an expert in analyzing GitHub repositories. 
    Please analyze the following README content and provide a concise summary 
    of the project's purpose, key features, and technical aspects.
    
    If available, also include:
    - Project maturity (based on stars, forks, and age)
    - Main programming languages used
    - Notable features or capabilities
    - Any specific technologies or frameworks used
    
    Keep the summary concise and focused on the most important aspects.
    """
    
    if repo_metadata:
        # Add additional context from metadata
        stars = repo_metadata.get('stars', 0)
        forks = repo_metadata.get('forks', 0)
        age = parse_date(repo_metadata.get('created_at', '')).year if repo_metadata.get('created_at') else 'unknown'
        languages = list(repo_metadata.get('languages', {}).keys())[:3]  # Show top 3 languages
        
        additional_context = f"\n\nAdditional Context:\n- Stars: {stars}\n- Forks: {forks}\n- Age: {age}\n- Languages: {', '.join(languages)}"
        prompt += additional_context
    
    try:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt + "\n\nREADME Content:\n" + readme_content[:10000])
        return response.text
    except Exception as e:
        return f"Error generating summary: {str(e)}"
