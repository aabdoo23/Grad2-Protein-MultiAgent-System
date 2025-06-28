#!/bin/bash

# ODBC Driver Installation Script for Ubuntu/Debian
# This script installs Microsoft ODBC Driver 17 for SQL Server

echo "🔧 Installing Microsoft ODBC Driver 17 for SQL Server..."
echo "========================================================"

# Update package list
echo "📦 Updating package list..."
sudo apt-get update

# Install prerequisites
echo "🛠️ Installing prerequisites..."
sudo apt-get install -y curl gnupg2 software-properties-common apt-transport-https

# Add Microsoft package signing key
echo "🔑 Adding Microsoft package signing key..."
curl https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -

# Detect Ubuntu version and add appropriate repository
UBUNTU_VERSION=$(lsb_release -rs)
echo "🐧 Detected Ubuntu version: $UBUNTU_VERSION"

if [[ "$UBUNTU_VERSION" == "20.04" ]]; then
    echo "📋 Adding repository for Ubuntu 20.04..."
    sudo add-apt-repository "$(curl https://packages.microsoft.com/config/ubuntu/20.04/mssql-server-2019.list)"
    curl https://packages.microsoft.com/config/ubuntu/20.04/prod.list | sudo tee /etc/apt/sources.list.d/msprod.list
elif [[ "$UBUNTU_VERSION" == "22.04" ]]; then
    echo "📋 Adding repository for Ubuntu 22.04..."
    sudo add-apt-repository "$(curl https://packages.microsoft.com/config/ubuntu/22.04/mssql-server-2022.list)"
    curl https://packages.microsoft.com/config/ubuntu/22.04/prod.list | sudo tee /etc/apt/sources.list.d/msprod.list
else
    echo "⚠️ Using Ubuntu 20.04 repository as fallback..."
    curl https://packages.microsoft.com/config/ubuntu/20.04/prod.list | sudo tee /etc/apt/sources.list.d/msprod.list
fi

# Update package list again
echo "📦 Updating package list with Microsoft repositories..."
sudo apt-get update

# Install ODBC driver and tools
echo "💿 Installing ODBC Driver 17 for SQL Server..."
sudo ACCEPT_EULA=Y apt-get install -y msodbcsql17

# Install additional tools (optional but useful)
echo "🛠️ Installing SQL Server command-line tools..."
sudo ACCEPT_EULA=Y apt-get install -y mssql-tools

# Install unixODBC development headers (needed for pyodbc)
echo "📚 Installing unixODBC development headers..."
sudo apt-get install -y unixodbc-dev

# Add mssql-tools to PATH (optional)
echo "🔧 Adding mssql-tools to PATH..."
echo 'export PATH="$PATH:/opt/mssql-tools/bin"' >> ~/.bashrc

# Verify installation
echo "✅ Verifying installation..."
if odbcinst -q -d -n "ODBC Driver 17 for SQL Server"; then
    echo "✅ ODBC Driver 17 for SQL Server installed successfully!"
else
    echo "❌ Installation verification failed"
    exit 1
fi

# List available drivers
echo "📋 Available ODBC drivers:"
odbcinst -q -d

echo ""
echo "🎉 Installation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Source your bashrc: source ~/.bashrc"
echo "2. Test the Python setup: python3 database/setup.py"
echo ""
echo "If you encounter any issues, you may need to:"
echo "- Restart your terminal session"
echo "- Check firewall settings for SQL Server port 1433"
echo "- Verify your SQL Server connection details in .env file"
صص