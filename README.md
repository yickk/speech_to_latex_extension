# speech_to_latex_extension
Chrome extension for converting speech into LaTeX using Gemini AI

## Setup

1. Open `chrome://extensions/`
2. Enable Developer mode (toggle in top right corner)
3. Click "Load unpacked" (top left corner) and select the `speech_to_latex_extension` folder
4. Get a free Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey)
5. Click the extension options (puzzle piece icon → Speech → LaTeX → options)
6. Paste your Gemini API key and click Save

## Usage

1. Open any Overleaf project
2. Press **Alt+S** (or **Option+S** on Mac) to start recording
3. Allow microphone access when prompted
4. Speak your mathematics or physics notation
5. Press **Alt+S** again to stop recording and send to Gemini
6. Your speech will be transcribed and converted to LaTeX, then inserted into the editor

## Features

- Physics-aware transcription (vectors, operators, derivatives, units)
- Automatic LaTeX formatting with proper math mode
- Support for fractions, Greek letters, matrices, and more
- Works with all Overleaf projects
