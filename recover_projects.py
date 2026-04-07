#!/usr/bin/env python3
"""
Script to recover projects from the ./projects folder into MongoDB.
Run this after MongoDB data is lost but project files still exist.

Usage:
    python recover_projects.py
    
Or with Docker:
    docker compose exec fastapi-ai python /app/recover_projects.py
"""

import os
import json
from datetime import datetime
from pymongo import MongoClient

# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/ai_ui_generator")
PROJECTS_DIR = os.getenv("PROJECTS_DIR", "./projects")

def get_project_prompt(project_path):
    """Try to extract a prompt/description from the project files."""
    # Check for package.json
    pkg_path = os.path.join(project_path, "package.json")
    if os.path.exists(pkg_path):
        try:
            with open(pkg_path, 'r', encoding='utf-8') as f:
                pkg = json.load(f)
                if pkg.get("description"):
                    return pkg["description"]
                if pkg.get("name"):
                    return f"Project: {pkg['name']}"
        except:
            pass
    
    # Check for README
    readme_path = os.path.join(project_path, "README.md")
    if os.path.exists(readme_path):
        try:
            with open(readme_path, 'r', encoding='utf-8') as f:
                first_line = f.readline().strip()
                if first_line.startswith("# "):
                    return first_line[2:]
                return first_line[:100] if first_line else None
        except:
            pass
    
    # Check for index.html title
    index_path = os.path.join(project_path, "index.html")
    if os.path.exists(index_path):
        try:
            with open(index_path, 'r', encoding='utf-8') as f:
                content = f.read()
                import re
                match = re.search(r'<title>([^<]+)</title>', content)
                if match:
                    return match.group(1)
        except:
            pass
    
    return f"Recovered project: {os.path.basename(project_path)}"


def get_folder_mtime(folder_path):
    """Get the latest modification time from all files in the folder."""
    latest = 0
    for root, dirs, files in os.walk(folder_path):
        for f in files:
            try:
                mtime = os.path.getmtime(os.path.join(root, f))
                if mtime > latest:
                    latest = mtime
            except:
                pass
    return datetime.fromtimestamp(latest) if latest > 0 else datetime.now()


def recover_projects():
    print(f"Connecting to MongoDB: {MONGO_URI}")
    client = MongoClient(MONGO_URI)
    db = client.get_database()
    generations = db["generations"]
    
    print(f"Scanning projects in: {PROJECTS_DIR}")
    
    if not os.path.exists(PROJECTS_DIR):
        print(f"ERROR: Projects directory not found: {PROJECTS_DIR}")
        return
    
    # Get list of project folders
    folders = [f for f in os.listdir(PROJECTS_DIR) 
               if os.path.isdir(os.path.join(PROJECTS_DIR, f))]
    
    print(f"Found {len(folders)} project folders")
    
    recovered = 0
    skipped = 0
    
    for folder_name in folders:
        project_path = os.path.join(PROJECTS_DIR, folder_name)
        
        # Check if already exists in MongoDB
        existing = generations.find_one({"generationId": folder_name})
        if existing:
            print(f"  SKIP: {folder_name} (already in DB)")
            skipped += 1
            continue
        
        # Get project metadata
        prompt = get_project_prompt(project_path)
        mtime = get_folder_mtime(project_path)
        
        # Create generation document
        doc = {
            "generationId": folder_name,
            "sessionId": f"recovered-{folder_name[:8]}",
            "status": "COMPLETE",
            "prompt": prompt,
            "activeVersion": 1,
            "createdAt": mtime,
            "updatedAt": mtime,
            "userId": "recovered-user"
        }
        
        try:
            generations.insert_one(doc)
            print(f"  RECOVERED: {folder_name} - {prompt[:50]}...")
            recovered += 1
        except Exception as e:
            print(f"  ERROR: {folder_name} - {e}")
    
    print(f"\nDone! Recovered: {recovered}, Skipped: {skipped}")
    client.close()


if __name__ == "__main__":
    recover_projects()
