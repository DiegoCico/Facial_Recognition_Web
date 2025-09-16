export interface FaceDetectionResult {
    id: string;
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    confidence: number;
    landmarks: Array<{
        x: number;
        y: number;
    }>;
}
export interface PersonInformation {
    name: string;
    title?: string;
    company?: string;
    linkedInProfile?: string;
    bio?: string;
    confidence: number;
}
export interface BubbleConfiguration {
    id: string;
    position: {
        x: number;
        y: number;
    };
    content: PersonInformation;
    isVisible: boolean;
    linkedInUrl?: string;
}
export interface CameraConfig {
    video: MediaTrackConstraints;
}
export interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}
export interface OpenAIResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}
export interface ErrorState {
    type: 'camera' | 'detection' | 'api' | 'recognition';
    message: string;
    recoverable: boolean;
}
export type CameraPermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';
export type RecognitionState = 'idle' | 'detecting' | 'recognizing' | 'querying' | 'complete' | 'error';
export interface ModelLoadingProgress {
    modelName: string;
    loaded: boolean;
    progress: number;
    error?: string;
}
export interface ModelLoadingState {
    isLoading: boolean;
    totalModels: number;
    loadedModels: number;
    progress: number;
    models: ModelLoadingProgress[];
    error?: string | undefined;
}
export type ModelType = 'ssdMobilenetv1' | 'faceLandmark68Net' | 'faceRecognitionNet' | 'faceExpressionNet';
export interface FaceDescriptor {
    id: string;
    descriptor: Float32Array;
    personName: string;
    confidence: number;
    createdAt: Date;
}
export interface FaceMatch {
    personName: string;
    confidence: number;
    distance: number;
    descriptorId: string;
}
export interface RecognitionResult {
    isMatch: boolean;
    match?: FaceMatch;
    confidence: number;
    processingTime: number;
}
export interface KnownFace {
    id: string;
    name: string;
    descriptors: Float32Array[];
    addedAt: Date;
    lastSeen?: Date;
}
export interface FaceDatabase {
    faces: Map<string, KnownFace>;
    totalDescriptors: number;
    lastUpdated: Date;
}
//# sourceMappingURL=index.d.ts.map