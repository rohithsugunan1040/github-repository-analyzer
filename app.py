from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv
import os
import markdown2

# Load environment variables from .env file
load_dotenv()

from github_utils import (
    parse_github_url,
    get_repo_metadata,
    get_contributors,
    get_commit_activity,
    get_repo_readme,
    get_repo_releases,
    generate_repo_summary
)


# Check if GitHub token is available
if not os.getenv("GITHUB_TOKEN"):
    raise RuntimeError("GitHub token not found. Please set GITHUB_TOKEN in .env file")

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze_repo():
    try:
        data = request.get_json()
        if not data or 'url' not in data:
            return jsonify({"error": "No URL provided"}), 400

        # Parse GitHub URL
        owner, repo = parse_github_url(data['url'])
        
        # Gather repository data
        repo_data = {
            "owner": owner,
            "repo": repo,
            "metadata": get_repo_metadata(owner, repo),
            "contributors": get_contributors(owner, repo),
            "commit_activity": get_commit_activity(owner, repo)
        }

        # Get README content
        readme = get_repo_readme(owner, repo)
        if readme.get("content"):
            repo_data["readme"] = {
                "content": readme["content"],
                "html": markdown2.markdown(readme["content"]),
                "summary": generate_repo_summary(readme["content"], repo_data["metadata"])
            }
        
        # Get releases
        releases = get_repo_releases(owner, repo)
        if releases:
            repo_data["releases"] = releases
        
        return jsonify(repo_data)
        
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
