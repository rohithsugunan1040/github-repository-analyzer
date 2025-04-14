// Initialize collapsible sections and modal functionality
document.addEventListener('DOMContentLoaded', () => {
    // Initialize collapsible sections
    document.querySelectorAll('.collapsible-header').forEach(header => {
        header.addEventListener('click', () => {
            const section = header.parentElement;
            section.classList.toggle('active');
            const icon = header.querySelector('.toggle-icon');
            icon.textContent = section.classList.contains('active') ? '▼' : '▲';
        });
    });
    
    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('readme-modal');
        const releasesModal = document.getElementById('releases-modal');
        if (event.target === modal) {
            closeReadmeModal();
        } else if (event.target === releasesModal) {
            closeReleasesModal();
        }
    });
    
    // Close modal with Escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeReadmeModal();
            closeReleasesModal();
        }
    });
});

// Open README modal
function openReadmeModal() {
    document.getElementById('readme-modal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
}

// Close README modal
function closeReadmeModal() {
    document.getElementById('readme-modal').style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
}

// Open Releases modal
function openReleasesModal() {
    document.getElementById('releases-modal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent scrolling behind modal
}

// Close Releases modal
function closeReleasesModal() {
    document.getElementById('releases-modal').style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
}

async function analyzeRepo() {
    const urlInput = document.getElementById('repoUrl');
    const errorDiv = document.getElementById('error');
    const resultsDiv = document.getElementById('results');
    const analyzeButton = document.querySelector('button');
    
    // Clear previous results
    errorDiv.textContent = '';
    ['metadata', 'ai-summary', 'readme-button-container', 'releases-button-container', 'contributors', 'activity'].forEach(id => {
        const element = document.getElementById(id);
        if (element.classList.contains('collapsible')) {
            element.querySelector('.collapsible-content').innerHTML = '';
            element.classList.remove('active');
            element.classList.add('hidden');
        } else {
            element.innerHTML = '';
        }
    });
    
    // Clear modal contents
    document.getElementById('readme-content').innerHTML = '';
    document.getElementById('releases-content').innerHTML = '';
    
    // Show loading state
    analyzeButton.disabled = true;
    analyzeButton.innerHTML = '<span class="spinner"></span> Analyzing...';
    
    try {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: urlInput.value })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to analyze repository');
        }
        
        // Display metadata
        displayMetadata(data.metadata);
        
        // Display AI Summary if README is available
        if (data.readme?.summary) {
            // Show summarizing indicator
            const summaryDiv = document.getElementById('ai-summary');
            summaryDiv.innerHTML = '<div class="loading-indicator"><span class="spinner"></span> Generating AI summary...</div>';
            
            // Small delay to show the loading state
            await new Promise(resolve => setTimeout(resolve, 500));
            
            displayAISummary(data.readme.summary);
        }
        
        // Display README button if README is available
        if (data.readme?.html) {
            const buttonContainer = document.getElementById('readme-button-container');
            buttonContainer.innerHTML = `
                <button class="readme-button" onclick="openReadmeModal()">
                    <span class="readme-button-icon">📖</span> View README
                </button>
            `;
            
            // Store README content in the modal
            document.getElementById('readme-content').innerHTML = data.readme.html;
        }
        
        // Display releases if available
        if (data.releases?.length > 0) {
            const buttonContainer = document.getElementById('releases-button-container');
            buttonContainer.innerHTML = `
                <button class="readme-button" onclick="openReleasesModal()">
                    <span class="readme-button-icon">🏷️</span> Releases
                </button>
            `;
            
            // Store releases content in the modal
            displayReleases(data.releases, data.owner, data.repo);
        }
        
        // Display contributors
        displayContributors(data.contributors);
        
        // Display commit activity
        displayCommitActivity(data.commit_activity);
        
    } catch (error) {
        errorDiv.textContent = error.message;
    } finally {
        // Reset button state
        analyzeButton.disabled = false;
        analyzeButton.textContent = 'Analyze';
    }
}

function displayMetadata(meta) {
    const createdDate = new Date(meta.created_at).toLocaleDateString();
    const updatedDate = new Date(meta.updated_at).toLocaleDateString();
    
    // Get non-default branches
    const otherBranches = meta.branches
        ? meta.branches.filter(branch => !branch.is_default).map(branch => branch.name)
        : [];
    
    document.getElementById('metadata').innerHTML = `
        <h2>Repository Info</h2>
        <p><strong>${meta.name}</strong> ${meta.description ? `- ${meta.description}` : ''}</p>
        <div class="metadata-grid">
            <div class="metrics" style="height: 200px;">
                <h3>Activity Metrics</h3>
                <ul>
                    <li>⭐ Stars: ${meta.stars}</li>
                    <li>🔄 Forks: ${meta.forks}</li>
                    <li>👀 Watchers: ${meta.watchers}</li>
                    <li>❗ Open Issues: ${meta.open_issues}</li>
                </ul>
            </div>
            <div class="technical">
                <h3>Technical Details</h3>
                <ul>
                    <li>Primary Language: ${meta.language || 'Not specified'}</li>
                    <li>Size: ${(meta.size/1024).toFixed(2)} MB</li>
                    <li>Default Branch: ${meta.default_branch}</li>
                    <li>Number of Branches: ${meta.branch_count || 0}</li>
                    ${meta.license ? `<li>License: ${meta.license}</li>` : ''}
                </ul>
                
                <div class="technical-flex">
                    ${otherBranches.length > 0 ? `
                    <div class="tech-section branches">
                        <h4>Other Branches:</h4>
                        <div class="branch-list">
                            ${otherBranches.map(branch => `<span class="branch-tag">${branch}</span>`).join(' ')}
                        </div>
                    </div>
                    ` : ''}
                    
                    ${Object.keys(meta.languages).length > 0 ? `
                    <div class="tech-section languages">
                        <h4>Languages Used:</h4>
                        <div class="language-bars">
                            ${Object.entries(meta.languages)
                                .sort((a, b) => b[1].bytes - a[1].bytes)
                                .map(([lang, data]) => `
                                    <div class="language-item">
                                        <div class="language-label">
                                            ${lang}: ${data.percentage}%
                                        </div>
                                        <div class="language-bar">
                                            <div class="language-fill" style="width: ${data.percentage}%"></div>
                                        </div>
                                    </div>
                                `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="status">
                <h3>Status</h3>
                <ul>
                    <li>Visibility: ${meta.visibility}</li>
                    <li>Status: ${meta.archived ? '📦 Archived' : '🟢 Active'}</li>
                    <li>Created: ${createdDate}</li>
                    <li>Last Updated: ${updatedDate}</li>
                </ul>
            </div>
            ${meta.topics.length > 0 ? `
            <div class="topics">
                <h3>Topics</h3>
                <div class="topic-tags">
                    ${meta.topics.map(topic => `<span class="topic">${topic}</span>`).join(' ')}
                </div>
            </div>` : ''}
        </div>
    `;
    
    // Show results
    document.getElementById('results').style.display = 'block';
}

function displayAISummary(summary) {
    const summaryDiv = document.getElementById('ai-summary');
    
    // Format the summary for better readability
    let formattedSummary = summary;
    
    // Replace section headers with styled headers
    formattedSummary = formattedSummary.replace(/Project Purpose:/g, '<h4 class="summary-section">📋 Project Purpose</h4>');
    formattedSummary = formattedSummary.replace(/Tech Stack:/g, '<h4 class="summary-section">🔧 Tech Stack</h4>');
    formattedSummary = formattedSummary.replace(/Setup\/Usage:/g, '<h4 class="summary-section">🚀 Setup/Usage</h4>');
    
    // Handle markdown formatting
    
    // Bold text (** **)
    formattedSummary = formattedSummary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Italic text (* *)
    formattedSummary = formattedSummary.replace(/\*([^\*]+)\*/g, '<em>$1</em>');
    
    // Convert markdown bullet points to HTML lists
    formattedSummary = formattedSummary.replace(/(\n\s*\*\s+.*(\n\s*\*\s+.*)*)/g, function(match) {
        const items = match.split(/\n\s*\*\s+/).filter(item => item.trim());
        return '<ul class="summary-list">' + 
               items.map(item => `<li>${item.trim()}</li>`).join('') + 
               '</ul>';
    });
    
    // Convert numbered lists
    formattedSummary = formattedSummary.replace(/(\n\s*\d+\.\s+.*(\n\s*\d+\.\s+.*)*)/g, function(match) {
        const items = match.split(/\n\s*\d+\.\s+/).filter(item => item.trim());
        return '<ol class="summary-list">' + 
               items.map(item => `<li>${item.trim()}</li>`).join('') + 
               '</ol>';
    });
    
    // Convert code blocks
    formattedSummary = formattedSummary.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Replace double line breaks with paragraph tags
    formattedSummary = formattedSummary.replace(/\n\n/g, '</p><p>');
    
    // Replace single line breaks with <br>
    formattedSummary = formattedSummary.replace(/\n/g, '<br>');
    
    summaryDiv.innerHTML = `
        <div class="ai-summary">
            <h3>🤖 AI Analysis</h3>
            <div class="summary-content">
                <p>${formattedSummary}</p>
            </div>
        </div>
    `;
}

function displayReleases(releases, owner, repo) {
    // If no releases, show message and exit
    if (!releases || releases.length === 0) {
        document.getElementById('releases-content').innerHTML = `
            <div class="no-releases">No releases available for this repository.</div>
        `;
        return;
    }
    
    // Group releases by version
    const releasesByVersion = {};
    
    // Process all releases
    releases.forEach(release => {
        const tagName = release.tag_name;
        
        // Initialize release object if not exists
        if (!releasesByVersion[tagName]) {
            releasesByVersion[tagName] = {
                name: release.name || tagName,
                tag_name: tagName,
                published_at: new Date(release.published_at).toLocaleDateString(),
                assets: []
            };
        }
        
        // Add assets if they exist
        if (release.assets && release.assets.length > 0) {
            releasesByVersion[tagName].assets.push(...release.assets);
        }
    });
    
    // Generate HTML for each release
    let html = '';
    Object.values(releasesByVersion).forEach(release => {
        // Release header
        html += `
        <div class="release-version">
            <div class="release-version-header">
                <h3>${release.name}</h3>
                <span class="release-tag">${release.tag_name}</span>
                <span class="release-date">Released on ${release.published_at}</span>
            </div>
            <div class="downloads-grid">`;
        
        // If has assets, show them
        if (release.assets && release.assets.length > 0) {
            release.assets.forEach(asset => {
                // Simple icon selection
                const icon = getAssetIcon(asset.content_type);
                const fileType = asset.content_type ? asset.content_type.split('/').pop() : 'file';
                
                html += `
                <div class="download-item">
                    <div class="download-info">
                        <div class="download-name">${icon} ${asset.name}</div>
                        <div class="download-meta">
                            <span class="download-size">${formatBytes(asset.size)}</span>
                            <span class="download-count">${asset.download_count.toLocaleString()} downloads</span>
                            <span class="download-type">${fileType}</span>
                        </div>
                    </div>
                    <a href="${asset.download_url}" class="download-button" target="_blank" download>
                        <span class="download-icon">📥</span>
                    </a>
                </div>`;
            });
        } 
        // Otherwise show fallback source downloads
        else {
            const tagName = encodeURIComponent(release.tag_name);
            const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/tags/${tagName}.zip`;
            const tarUrl = `https://github.com/${owner}/${repo}/archive/refs/tags/${tagName}.tar.gz`;
            
            // Add ZIP download
            html += `
            <div class="download-item">
                <div class="download-info">
                    <div class="download-name">📦 Source code (zip)</div>
                    <div class="download-meta">
                        <span class="download-type">ZIP</span>
                        <span>Source archive</span>
                    </div>
                </div>
                <a href="${zipUrl}" class="download-button" target="_blank" download>
                    <span class="download-icon">📥</span>
                </a>
            </div>`;
            
            // Add TAR.GZ download
            html += `
            <div class="download-item">
                <div class="download-info">
                    <div class="download-name">📦 Source code (tar.gz)</div>
                    <div class="download-meta">
                        <span class="download-type">TAR.GZ</span>
                        <span>Source archive</span>
                    </div>
                </div>
                <a href="${tarUrl}" class="download-button" target="_blank" download>
                    <span class="download-icon">📥</span>
                </a>
            </div>`;
        }
        
        html += `
            </div>
        </div>`;
    });
    
    document.getElementById('releases-content').innerHTML = html;
}

// Helper function to determine asset icon
function getAssetIcon(contentType) {
    if (!contentType) return '📄';
    
    if (contentType.includes('zip') || contentType.includes('tar') || contentType.includes('compressed')) {
        return '📦';
    } else if (contentType.includes('executable') || contentType.includes('application')) {
        return '⚙️';
    } else if (contentType.includes('image')) {
        return '🖼️';
    } else if (contentType.includes('text') || contentType.includes('json')) {
        return '📝';
    }
    return '📄';
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function displayContributors(contributors) {
    const contributorsHtml = contributors.map(c => 
        `<li>${c.login}: ${c.contributions} contributions</li>`
    ).join('');
    
    document.getElementById('contributors').innerHTML = `
        <h2>Top Contributors</h2>
        <ul>${contributorsHtml}</ul>
    `;
}

function displayCommitActivity(activityData) {
    const activityDiv = document.getElementById('activity');
    if (activityData.length > 0) {
        activityDiv.innerHTML = `
            <h2>Recent Commit Activity</h2>
            <p>Total commits in the last ${activityData.length} weeks: 
               ${activityData.reduce((sum, week) => sum + week.total, 0)}</p>
        `;
    }
}
