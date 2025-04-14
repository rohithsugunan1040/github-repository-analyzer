# GitHub Repository Analyzer

A web-based tool designed to analyze GitHub repositories by fetching release metadata, contributors, commit activity, README files, releases, and more — enhanced with an optional AI summary using Gemini API. Ideal for developers, researchers, and portfolio projects.

---

## 🚀 Features

- 🔍 Analyze public GitHub repositories using GitHub API
- 📄 View README content and contributors
- 📊 See commit activity and release downloads
- 🤖 Optional AI-generated summary using **Gemini API**
- 🐳 Easy deployment using **Docker**

---

## 🛠️ Installation

### Prerequisites

- Python 3.7+
- Git
- Docker (optional)
- GitHub Personal Access Token (for authenticated API requests)
- Gemini API Key (for AI summary feature)

---

## 🔐 Environment Variables

Create a `.env` file in your root directory with the following format:

```env
GITHUB_TOKEN=your_github_personal_access_token
GEMINI_API_KEY=your_google_generativeai_key
```

> ⚠️ **Never commit your `.env` file to GitHub.** It's already listed in `.gitignore`.

---

## 🧪 Running Locally

### 1. Clone the Repo

```bash
git clone https://github.com/rohithsugunan1040/github-repository-analyzer.git
cd github-repository-analyzer
```

### 2. Create a Virtual Environment (optional)

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Add `.env` File

Refer to the `.env` example above and place it in the root of your project.

### 5. Run the App

```bash
python app.py
```

Then open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser.

---

## 🐳 Docker Instructions

### 1. Build the Docker Image

```bash
docker build -t github-repository-analyzer .
```

### 2. Run the Container with Environment Variables

```bash
docker run --env-file .env -p 5000:5000 github-repository-analyzer
```

> 🔐 This will securely inject your GitHub and Gemini keys inside the container.

---

## 📁 Project Structure

```
github-repository-analyzer/
├── app.py
├── github_utils.py
├── requirements.txt
├── Dockerfile
├── .env (not committed)
├── static/
│   └── script.js
├── templates/
│   └── index.html
└── .gitignore
```

---

## 🤖 AI Summary Feature

If the project contains a README, and a Gemini API key is provided, the app can generate an AI-powered summary including:

- Project purpose
- Tech stack
- Usage instructions
- Suggestions for improvement

This section is optional and toggled via a button in the UI.

---

## 📄 License

This project is licensed under the MIT License.

---

## 🤝 Contributing

Pull requests are welcome! Feel free to fork this repo and improve it.
