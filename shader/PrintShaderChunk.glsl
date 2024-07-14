// Custom, Procedural 3D print normal mapping shader code
// for injection into another material

#include <noise>
precision highp float;
uniform float height;
uniform float layerThickness;
uniform float layerWidth;
uniform float distortionScale;
varying vec3 uPosition;
varying vec3 uNormal;

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
    float dist = abs(position.x - position.y) / sqrt(2.0);
    float distortedPos = dist + noise * distortionScale; // Apply distortion scale to the noise output

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

float computeLayers(vec3 position, vec3 normal, float vThresh, float hThresh, float vSmooth, float hSmooth, float vTol) {
    // Compute Layer Lines
    float verticalLayers = calculateVerticalLayerPattern(position, vThresh, vSmooth);
    float horizontalLayers = calculateHorizontalLayerPattern(position, hThresh, hSmooth);

    // Blend Between Layers based on Normal Vector
    float verticality = step(1.0 - vTol, abs(normal.z));
    float layers = mix(verticalLayers, horizontalLayers, verticality);
    // float layers = mix(horizontalLayers, verticalLayers, verticality);

    return layers;
}


vec4 printLayerNormals(vec3 position, vec3 normal, vec3 uNormal) {
    // Viewing Factor
    float pixelsPerLayer = layerThickness / fwidth(position.z);
    float pixelRatio = pixelsPerLayer / 30.0;
    float visibilityFactor = smoothstep(0.0, 1.0, pixelRatio);

    // Compute Layer Lines
    float layers = computeLayers(position, uNormal, 0.95, 0.95, 0.2, 0.2, 1e-3);

    // Displaced Normal
    vec3 printNormals = normalize(normal + 4.0*vec3(-dFdx(layers), -dFdy(layers), 1.0));
    vec3 finalNormals = mix(normal, printNormals, visibilityFactor);
    float finalLayers = mix(1.0, layers, visibilityFactor);
    return vec4(finalNormals, finalLayers);
}
