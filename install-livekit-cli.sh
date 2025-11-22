#!/bin/bash
# Install LiveKit CLI script

set -e

echo "Installing LiveKit CLI..."

# Try official installer first
if command -v curl &> /dev/null; then
    echo "Attempting to install via official script..."
    curl -sSL https://get.livekit.io/cli | bash
    
    # Check if it worked
    if command -v lk &> /dev/null; then
        echo "✅ LiveKit CLI installed successfully!"
        lk --version
        exit 0
    fi
fi

# Fallback: Manual download
echo "Trying manual download..."

# Create bin directory
mkdir -p ~/bin

# Try different release versions
VERSIONS=("v2.12.9" "v2.12.8" "v2.12.0" "latest")

for VERSION in "${VERSIONS[@]}"; do
    echo "Trying version $VERSION..."
    
    if [ "$VERSION" = "latest" ]; then
        URL="https://github.com/livekit/livekit-cli/releases/latest/download/livekit-cli-darwin-amd64"
    else
        URL="https://github.com/livekit/livekit-cli/releases/download/${VERSION}/livekit-cli-darwin-amd64"
    fi
    
    if curl -L -f "$URL" -o ~/bin/lk-tmp 2>/dev/null; then
        # Check if it's a valid binary
        if file ~/bin/lk-tmp | grep -q "Mach-O"; then
            mv ~/bin/lk-tmp ~/bin/lk
            chmod +x ~/bin/lk
            echo "✅ LiveKit CLI installed to ~/bin/lk"
            
            # Add to PATH
            if ! echo "$PATH" | grep -q "$HOME/bin"; then
                echo 'export PATH="$HOME/bin:$PATH"' >> ~/.zshrc
                echo "✅ Added ~/bin to PATH in ~/.zshrc"
                echo "Run: source ~/.zshrc or restart your terminal"
            fi
            
            # Test it
            ~/bin/lk --version
            exit 0
        fi
    fi
done

echo "❌ Failed to install LiveKit CLI automatically"
echo ""
echo "Please try one of these options:"
echo "1. Update Command Line Tools: sudo xcode-select --install"
echo "2. Then: brew install livekit-cli"
echo "3. Or download manually from: https://github.com/livekit/livekit-cli/releases"

