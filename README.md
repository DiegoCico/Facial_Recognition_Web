# Facial Recognition Website

A web application that uses facial recognition and ChatGPT to display information bubbles with LinkedIn profile links above detected faces.

## Features

- Real-time facial detection using face-api.js
- Face recognition with confidence scoring
- ChatGPT integration for person information lookup
- LinkedIn profile matching and linking
- Interactive information bubbles above detected faces
- Privacy-focused client-side processing
- TypeScript implementation with full type safety

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenAI API key
   ```

3. **Build the TypeScript code:**
   ```bash
   npm run build
   ```

4. **Serve the application:**
   ```bash
   npm run serve
   ```

5. **Open your browser and navigate to:**
   ```
   http://localhost:8080
   ```

## Development

- **Watch mode for TypeScript compilation:**
  ```bash
  npm run dev
  ```

- **Run tests:**
  ```bash
  npm test
  ```

- **Run tests in watch mode:**
  ```bash
  npm run test:watch
  ```

## Usage

1. Click "Start Camera" to begin facial recognition
2. Allow camera permissions when prompted
3. Point the camera at faces to see information bubbles appear
4. Click LinkedIn links in bubbles to open profiles in new tabs
5. Click "Stop Camera" to end the session

## Privacy & Security

- All facial processing happens client-side
- No facial images are sent to external servers
- Camera access is terminated when you leave the page
- Temporary facial data is automatically cleared after processing

## Browser Requirements

- Modern browser with WebRTC support
- Camera access permissions
- JavaScript enabled

## Architecture

The application uses a modular TypeScript architecture with the following services:

- **CameraManager**: Handles camera access and video stream management
- **FaceDetectionEngine**: Detects faces using face-api.js
- **FaceRecognitionService**: Identifies specific individuals
- **InformationService**: Queries ChatGPT for person information
- **BubbleOverlayManager**: Creates and manages information bubbles
- **LinkedInProfileMatcher**: Finds LinkedIn profiles through ChatGPT

## License

MIT License