/**
 * FaceDatabase manages the storage and training of known faces
 */
export class FaceDatabase {
    constructor(faceRecognitionService) {
        this.STORAGE_KEY = 'facial_recognition_database';
        this.MAX_DESCRIPTORS_PER_FACE = 10;
        this.MIN_TRAINING_SAMPLES = 3;
        this.faceRecognitionService = faceRecognitionService;
        this.database = {
            faces: new Map(),
            totalDescriptors: 0,
            lastUpdated: new Date()
        };
        this.loadFromStorage();
    }
    /**
     * Train a new face with multiple samples
     */
    async trainFace(name, videoElement, faceDetections, onProgress) {
        if (faceDetections.length === 0) {
            return {
                success: false,
                samplesAdded: 0,
                totalSamples: 0,
                message: 'No face detections provided for training'
            };
        }
        let samplesAdded = 0;
        const faceId = this.generateFaceId(name);
        for (let i = 0; i < faceDetections.length; i++) {
            if (onProgress) {
                onProgress(i + 1, faceDetections.length);
            }
            const faceDetection = faceDetections[i];
            if (!faceDetection)
                continue;
            const success = await this.faceRecognitionService.addKnownFace(name, videoElement, faceDetection);
            if (success) {
                samplesAdded++;
            }
            // Update our local database and check limits
            this.syncFromRecognitionService();
            const existingFace = this.database.faces.get(faceId);
            if (existingFace && existingFace.descriptors.length >= this.MAX_DESCRIPTORS_PER_FACE) {
                break;
            }
        }
        // Update our local database from the recognition service
        this.syncFromRecognitionService();
        this.saveToStorage();
        const totalSamples = this.database.faces.get(faceId)?.descriptors.length || 0;
        const isWellTrained = totalSamples >= this.MIN_TRAINING_SAMPLES;
        return {
            success: samplesAdded > 0,
            samplesAdded,
            totalSamples,
            message: isWellTrained
                ? `Successfully trained ${name} with ${totalSamples} samples`
                : `Added ${samplesAdded} samples for ${name}. Need ${this.MIN_TRAINING_SAMPLES - totalSamples} more for optimal recognition`
        };
    }
    /**
     * Add a single training sample for a face
     */
    async addTrainingSample(name, videoElement, faceDetection) {
        const success = await this.faceRecognitionService.addKnownFace(name, videoElement, faceDetection);
        if (success) {
            this.syncFromRecognitionService();
            this.saveToStorage();
        }
        return success;
    }
    /**
     * Remove a known face from the database
     */
    removeFace(name) {
        const success = this.faceRecognitionService.removeKnownFace(name);
        if (success) {
            const faceId = this.generateFaceId(name);
            this.database.faces.delete(faceId);
            this.database.lastUpdated = new Date();
            this.saveToStorage();
        }
        return success;
    }
    /**
     * Get all known faces with training status
     */
    getKnownFaces() {
        // Sync from recognition service to get latest data
        this.syncFromRecognitionService();
        return Array.from(this.database.faces.values()).map(face => ({
            ...face,
            isWellTrained: face.descriptors.length >= this.MIN_TRAINING_SAMPLES,
            trainingProgress: Math.min(face.descriptors.length / this.MIN_TRAINING_SAMPLES, 1)
        }));
    }
    /**
     * Get face by name
     */
    getFace(name) {
        // Sync from recognition service to get latest data
        this.syncFromRecognitionService();
        const faceId = this.generateFaceId(name);
        const face = this.database.faces.get(faceId);
        if (!face) {
            return null;
        }
        return {
            ...face,
            isWellTrained: face.descriptors.length >= this.MIN_TRAINING_SAMPLES,
            trainingProgress: Math.min(face.descriptors.length / this.MIN_TRAINING_SAMPLES, 1)
        };
    }
    /**
     * Get database statistics
     */
    getStatistics() {
        // Sync from recognition service to get latest data
        this.syncFromRecognitionService();
        const faces = Array.from(this.database.faces.values());
        const wellTrainedFaces = faces.filter(face => face.descriptors.length >= this.MIN_TRAINING_SAMPLES).length;
        const averageDescriptors = faces.length > 0
            ? faces.reduce((sum, face) => sum + face.descriptors.length, 0) / faces.length
            : 0;
        return {
            totalFaces: this.database.faces.size,
            totalDescriptors: this.database.totalDescriptors,
            wellTrainedFaces,
            averageDescriptorsPerFace: Math.round(averageDescriptors * 100) / 100,
            lastUpdated: this.database.lastUpdated,
            storageSize: this.getStorageSize()
        };
    }
    /**
     * Clear all faces from the database
     */
    clearDatabase() {
        this.faceRecognitionService.clearDatabase();
        this.database.faces.clear();
        this.database.totalDescriptors = 0;
        this.database.lastUpdated = new Date();
        this.saveToStorage();
    }
    /**
     * Export database to JSON
     */
    exportDatabase() {
        // Sync from recognition service to get latest data
        this.syncFromRecognitionService();
        const exportData = {
            faces: Array.from(this.database.faces.entries()).map(([id, face]) => ({
                id,
                name: face.name,
                descriptors: Array.from(face.descriptors).map(desc => Array.from(desc)),
                addedAt: face.addedAt.toISOString(),
                lastSeen: face.lastSeen?.toISOString()
            })),
            totalDescriptors: this.database.totalDescriptors,
            lastUpdated: this.database.lastUpdated.toISOString(),
            exportedAt: new Date().toISOString()
        };
        return JSON.stringify(exportData, null, 2);
    }
    /**
     * Import database from JSON
     */
    async importDatabase(jsonData) {
        try {
            const importData = JSON.parse(jsonData);
            if (!importData.faces || !Array.isArray(importData.faces)) {
                return {
                    success: false,
                    facesImported: 0,
                    descriptorsImported: 0,
                    message: 'Invalid database format'
                };
            }
            // Clear existing database
            this.clearDatabase();
            let facesImported = 0;
            let descriptorsImported = 0;
            for (const faceData of importData.faces) {
                try {
                    const face = {
                        id: faceData.id,
                        name: faceData.name,
                        descriptors: faceData.descriptors.map((desc) => new Float32Array(desc)),
                        addedAt: new Date(faceData.addedAt),
                        ...(faceData.lastSeen && { lastSeen: new Date(faceData.lastSeen) })
                    };
                    this.database.faces.set(faceData.id, face);
                    facesImported++;
                    descriptorsImported += face.descriptors.length;
                }
                catch (error) {
                    console.warn(`Failed to import face ${faceData.name}:`, error);
                }
            }
            this.database.totalDescriptors = descriptorsImported;
            this.database.lastUpdated = new Date();
            // Sync to recognition service
            this.syncToRecognitionService();
            this.saveToStorage();
            return {
                success: true,
                facesImported,
                descriptorsImported,
                message: `Successfully imported ${facesImported} faces with ${descriptorsImported} descriptors`
            };
        }
        catch (error) {
            return {
                success: false,
                facesImported: 0,
                descriptorsImported: 0,
                message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Validate face training quality
     */
    validateTraining(name) {
        // Sync from recognition service to get latest data
        this.syncFromRecognitionService();
        const faceId = this.generateFaceId(name);
        const face = this.database.faces.get(faceId);
        const recommendations = [];
        if (!face) {
            return {
                isValid: false,
                sampleCount: 0,
                recommendations: ['Face not found in database']
            };
        }
        if (face.descriptors.length < this.MIN_TRAINING_SAMPLES) {
            recommendations.push(`Add ${this.MIN_TRAINING_SAMPLES - face.descriptors.length} more training samples`);
        }
        if (face.descriptors.length < 5) {
            recommendations.push('Consider adding more samples for better accuracy');
        }
        if (face.descriptors.length === this.MAX_DESCRIPTORS_PER_FACE) {
            recommendations.push('Maximum training samples reached');
        }
        return {
            isValid: face.descriptors.length >= this.MIN_TRAINING_SAMPLES,
            sampleCount: face.descriptors.length,
            recommendations
        };
    }
    /**
     * Sync database from recognition service
     */
    syncFromRecognitionService() {
        const knownFaces = this.faceRecognitionService.getKnownFaces();
        const stats = this.faceRecognitionService.getDatabaseStats();
        // Update our database with the latest data
        this.database.faces.clear();
        for (const face of knownFaces) {
            this.database.faces.set(face.id, face);
        }
        this.database.totalDescriptors = stats.totalDescriptors;
        this.database.lastUpdated = stats.lastUpdated;
    }
    /**
     * Sync database to recognition service
     */
    syncToRecognitionService() {
        this.faceRecognitionService.clearDatabase();
        // This would require extending FaceRecognitionService to accept pre-computed descriptors
        // For now, we'll note this as a limitation
        console.warn('Direct sync to recognition service not implemented - requires manual re-training');
    }
    /**
     * Save database to localStorage
     */
    saveToStorage() {
        try {
            const serializedData = this.exportDatabase();
            localStorage.setItem(this.STORAGE_KEY, serializedData);
        }
        catch (error) {
            console.error('Failed to save database to storage:', error);
        }
    }
    /**
     * Load database from localStorage
     */
    loadFromStorage() {
        try {
            const storedData = localStorage.getItem(this.STORAGE_KEY);
            if (storedData) {
                this.importDatabase(storedData);
            }
        }
        catch (error) {
            console.error('Failed to load database from storage:', error);
        }
    }
    /**
     * Get storage size in bytes
     */
    getStorageSize() {
        try {
            const storedData = localStorage.getItem(this.STORAGE_KEY);
            return storedData ? new Blob([storedData]).size : 0;
        }
        catch (error) {
            return 0;
        }
    }
    /**
     * Generate a consistent face ID from a name
     */
    generateFaceId(name) {
        return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    }
}
//# sourceMappingURL=FaceDatabase.js.map