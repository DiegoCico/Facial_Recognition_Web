// Main entry point for the facial recognition application
import { CameraManager } from './services/CameraManager.js';
import { ModelLoader } from './services/ModelLoader.js';
import { FaceDetectionEngine } from './services/FaceDetectionEngine.js';
import { ModelLoadingIndicator } from './components/ModelLoadingIndicator.js';
class FacialRecognitionApp {
    constructor() {
        this.isRunning = false;
        this.animationFrameId = null;
        // Initialize DOM elements
        this.videoElement = document.getElementById('video');
        this.canvasElement = document.getElementById('canvas');
        this.overlayContainer = document.getElementById('overlay-container');
        this.startButton = document.getElementById('start-btn');
        this.stopButton = document.getElementById('stop-btn');
        this.statusElement = document.getElementById('status');
        this.errorElement = document.getElementById('error');
        // Initialize services
        this.cameraManager = new CameraManager();
        this.modelLoader = new ModelLoader();
        this.faceDetectionEngine = new FaceDetectionEngine();
        this.loadingIndicator = new ModelLoadingIndicator(document.body);
        this.setupEventListeners();
        this.initialize();
    }
    setupEventListeners() {
        this.startButton.addEventListener('click', () => this.startRecognition());
        this.stopButton.addEventListener('click', () => this.stopRecognition());
        // Handle page unload to clean up camera resources
        window.addEventListener('beforeunload', () => this.cleanup());
        window.addEventListener('unload', () => this.cleanup());
    }
    async initialize() {
        try {
            this.updateStatus('Initializing face detection models...');
            // Set up progress callback
            this.modelLoader.onProgress((state) => {
                this.loadingIndicator.updateProgress(state);
            });
            // Show loading indicator
            this.loadingIndicator.show();
            // Load models
            await this.modelLoader.loadModels('/models');
            // Initialize face detection engine
            await this.faceDetectionEngine.initialize();
            // Hide loading indicator
            this.loadingIndicator.hide();
            this.updateStatus('Ready to start facial recognition');
        }
        catch (error) {
            this.loadingIndicator.hide();
            this.handleError({
                type: 'detection',
                message: 'Failed to load face detection models',
                recoverable: false
            });
        }
    }
    async startRecognition() {
        try {
            // Check if models are loaded
            if (!this.modelLoader.areModelsLoaded()) {
                this.handleError({
                    type: 'detection',
                    message: 'Face detection models are not loaded yet',
                    recoverable: true
                });
                return;
            }
            this.updateStatus('Starting camera...');
            this.startButton.disabled = true;
            const stream = await this.cameraManager.initializeCamera();
            this.videoElement.srcObject = stream;
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = () => {
                    this.setupCanvas();
                    resolve();
                };
            });
            this.isRunning = true;
            this.startButton.disabled = true;
            this.stopButton.disabled = false;
            this.updateStatus('Camera active - detecting faces...');
            this.startDetectionLoop();
        }
        catch (error) {
            this.handleError({
                type: 'camera',
                message: error instanceof Error ? error.message : 'Failed to access camera',
                recoverable: true
            });
            this.startButton.disabled = false;
        }
    }
    stopRecognition() {
        this.isRunning = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.cameraManager.stopCamera();
        this.startButton.disabled = false;
        this.stopButton.disabled = true;
        this.updateStatus('Camera stopped');
    }
    setupCanvas() {
        const { videoWidth, videoHeight } = this.videoElement;
        this.canvasElement.width = videoWidth;
        this.canvasElement.height = videoHeight;
    }
    updateStatus(message) {
        this.statusElement.textContent = message;
        this.errorElement.classList.add('hidden');
    }
    handleError(error) {
        this.errorElement.textContent = error.message;
        this.errorElement.classList.remove('hidden');
        this.statusElement.textContent = '';
        if (!error.recoverable) {
            this.startButton.disabled = true;
        }
    }
    startDetectionLoop() {
        const detectFaces = async () => {
            if (!this.isRunning)
                return;
            try {
                const detections = await this.faceDetectionEngine.detectFaces(this.videoElement);
                // Clear canvas
                const ctx = this.canvasElement.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
                }
                // Draw face bounding boxes for detected faces
                for (const detection of detections) {
                    this.drawFaceBoundingBox(detection);
                }
            }
            catch (error) {
                console.error('Detection error:', error);
            }
            if (this.isRunning) {
                this.animationFrameId = requestAnimationFrame(detectFaces);
            }
        };
        detectFaces();
    }
    drawFaceBoundingBox(detection) {
        const ctx = this.canvasElement.getContext('2d');
        if (!ctx)
            return;
        const { x, y, width, height } = detection.boundingBox;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, width, height);
        // Draw confidence score
        ctx.fillStyle = '#00ff00';
        ctx.font = '16px Arial';
        ctx.fillText(`${Math.round(detection.confidence * 100)}%`, x, y - 5);
    }
    cleanup() {
        this.stopRecognition();
    }
}
// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FacialRecognitionApp();
});
//# sourceMappingURL=main.js.map