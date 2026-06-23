#!/bin/bash

# Setup script for Speech-to-Text Workflow
# This script helps set up the environment and install dependencies

echo "======================================================================"
echo "  🎤 Speech-to-Text Workflow - Setup Script"
echo "======================================================================"
echo ""

# Check Python version
echo "Checking Python version..."
python3 --version

if [ $? -ne 0 ]; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

echo "✅ Python 3 is installed"
echo ""

# Create virtual environment (optional but recommended)
echo "Do you want to create a virtual environment? (recommended) [y/n]"
read -r create_venv

if [ "$create_venv" = "y" ] || [ "$create_venv" = "Y" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    
    if [ $? -eq 0 ]; then
        echo "✅ Virtual environment created"
        echo ""
        echo "Activating virtual environment..."
        source venv/bin/activate
        echo "✅ Virtual environment activated"
    else
        echo "❌ Failed to create virtual environment"
        exit 1
    fi
fi

echo ""
echo "======================================================================"
echo "Installing dependencies..."
echo "======================================================================"
echo ""

# Upgrade pip and setuptools
echo "Upgrading pip and setuptools..."
pip install --upgrade pip setuptools wheel

# Ask which installation mode
echo ""
echo "======================================================================"
echo "Choose installation mode:"
echo "======================================================================"
echo ""
echo "1. Full installation (includes local Whisper model - ~2GB download)"
echo "2. Minimal installation (API-only mode - lightweight, requires OpenAI API key)"
echo ""
echo "Note: Option 1 may take several minutes and requires more disk space."
echo "      Option 2 is faster but requires an OpenAI API key to use."
echo ""
read -p "Select mode (1 or 2): " install_mode

if [ "$install_mode" = "2" ]; then
    echo ""
    echo "Installing minimal requirements (API-only mode)..."
    pip install -r requirements-minimal.txt
else
    echo ""
    echo "Installing full requirements (this may take a while)..."
    pip install -r requirements.txt
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All dependencies installed successfully"
else
    echo ""
    echo "❌ Failed to install some dependencies"
    echo "Please check the error messages above"
    exit 1
fi

# Create necessary directories
echo ""
echo "Creating directories..."
mkdir -p recordings
mkdir -p outputs

echo "✅ Directories created"

# Run test script
echo ""
echo "======================================================================"
echo "Running system tests..."
echo "======================================================================"
echo ""

python3 test_setup.py

echo ""
echo "======================================================================"
echo "Setup Complete!"
echo "======================================================================"
echo ""
echo "Next steps:"
echo "  1. If using virtual environment: source venv/bin/activate"
echo "  2. Run interactive mode: python main.py"
echo "  3. Or try examples: python examples.py"
echo "  4. Read documentation: cat README.md"
echo ""
echo "Quick commands:"
echo "  python main.py --record --duration 10    # Record and transcribe"
echo "  python main.py --file audio.wav          # Transcribe file"
echo "  python main.py --help                    # Show all options"
echo ""
echo "======================================================================"
