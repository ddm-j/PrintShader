// fragmentShader.glsl

#include <noise>

uniform float height;
uniform float layerThickness;
uniform float layerWidth;
uniform float distortionScale;
varying vec3 vPosition;
varying vec3 vNormal;

float calculateVerticalLayerPattern(vec3 position, float thresh, float smooth_region) {
    // Z Position Distortion
    float noise = snoise(position); // Scale the position to control the noise frequency
    float distortedZ = position.z + noise * distortionScale; // Apply distortion scale to the noise output

    // Layer Lines
    float layer = mod(distortedZ, layerThickness);
    float threshold = layerThickness * thresh; // Adjust this value for the space between layers

    // Define the width of the smoothing area (should be less than the gap)
    float smoothWidth = layerThickness * smooth_region; // Adjust for smoother or sharper transitions
    // Calculate smoothstep for both the beginning and end of the layer
    float smoothStart = smoothstep(0.0, smoothWidth, layer);
    float smoothEnd = smoothstep(threshold, threshold - smoothWidth, layer);
    // Combine both smooth transitions
    float smoothLayer = min(smoothStart, smoothEnd);

    return smoothLayer;
}

float calculateHorizontalLayerPattern(vec3 position, float thresh, float smooth_region) {
    // XY 45 Degree Position Layers
    float noise = snoise(position); // Scale the position to control the noise frequency
    float distance = abs(position.x - position.y) / sqrt(2.0);
    float distortedPos = distance + noise * distortionScale; // Apply distortion scale to the noise output

    // Layer Lines
    float layer = mod(distortedPos, layerWidth);
    float threshold = layerWidth * thresh; // Adjust this value for the space between layers

    // Define the width of the smoothing area (should be less than the gap)
    float smoothWidth = layerWidth * smooth_region; // Adjust for smoother or sharper transitions
    // Calculate smoothstep for both the beginning and end of the layer
    float smoothStart = smoothstep(0.0, smoothWidth, layer);
    float smoothEnd = smoothstep(threshold, threshold - smoothWidth, layer);
    // Combine both smooth transitions
    float smoothLayer = min(smoothStart, smoothEnd);

    return smoothLayer;
}

float computeLayers(vec3 position, float vThresh, float hThresh, float vSmooth, float hSmooth, float vTol) {
    // Compute Layer Lines
    float verticalLayers = calculateVerticalLayerPattern(vPosition, vThresh, vSmooth);
    float horizontalLayers = calculateHorizontalLayerPattern(vPosition, hThresh, hSmooth);

    // Blend Between Layers based on Normal Vector
    float verticality = step(1.0 - vTol, abs(vNormal.z));
    float layers = mix(verticalLayers, horizontalLayers, verticality);

    return layers;
}

void main() {
    // Compute Layer Lines
    float layers = computeLayers(vPosition, 0.95, 0.95, 0.2, 0.2, 1e-4);

    // Color based on smoothed layer value
    vec3 color = vec3(layers); // Resulting color: black to white gradient

    //vec3 color = (layer < threshold) ? vec3(1.0, 1.0, 1.0) : vec3(0.0, 0.0, 0.0);
    gl_FragColor = vec4(color, 1.0);
}
