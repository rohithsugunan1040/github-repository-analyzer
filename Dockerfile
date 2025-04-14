FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Install dependencies first (for better caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create a non-root user and set permissions
RUN useradd -m appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose the port the app runs on
EXPOSE 5000

# Environment variables (can be overridden at runtime)
ENV FLASK_ENV=production
ENV FLASK_APP=app.py
# Note: GITHUB_TOKEN and GEMINI_API_KEY should be provided at runtime

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/ || exit 1

# Command to run the application
CMD ["python", "app.py"]

# =====================================================================
# HOW TO RUN:
# 1. Build the image:
#    docker build -t repo-analyzer .
#
# 2. Run the container with your API keys:
#    docker run -p 5000:5000 \
#      -e GITHUB_TOKEN=your_github_token \
#      -e GEMINI_API_KEY=your_gemini_api_key \
#      repo-analyzer
#
# 3. Access the application at:
#    http://localhost:5000
# =====================================================================
