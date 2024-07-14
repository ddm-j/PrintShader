#include <noise>
precision highp float;
uniform vec3 baseColor;
uniform float height;
uniform float layerThickness;
uniform float layerWidth;
uniform float distortionScale;
uniform vec3 lightColor;
uniform vec3 lightDirection;
uniform vec3 viewDirection;

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
    // Compute Screen Space Derivative
    // float detail = max(length(dFdx(vPosition)), length(dFdy(vPosition)));
    // float pixelsPerLayer = layerThickness / length(vec2(dFdx(vPosition.z), dFdy(vPosition.z)));
    float pixelsPerLayer = layerThickness / fwidth(vPosition.z);
    float pixelRatio = pixelsPerLayer / 60.0;
    float visibilityFactor = smoothstep(0.0, 1.0, pixelRatio);

    // Compute Layer Lines
    float layers = computeLayers(vPosition, 0.95, 0.95, 0.2, 0.2, 1e-4);

    // Displaced Normal
    vec3 normal = normalize(vNormal);
    vec3 dNormal = normalize(vNormal + 2.0*vec3(-dFdx(layers), -dFdy(layers), 1.0));

    // Simple diffuse lighting
    float dlightIntensity = pow(max(dot(dNormal, lightDirection), 0.0), 1.0);
    float lightIntensity = pow(max(dot(normal, lightDirection), 0.0), 1.0);
    vec3 lighting = lightColor*mix(lightIntensity, dlightIntensity, visibilityFactor);

    // Calculate specular reflection
    float roughness = 0.0;
    vec3 reflectDir = reflect(lightDirection, dNormal);
    float specAngle = max(dot(reflectDir, viewDirection), 0.0);
    float specular = pow(specAngle, mix(16.0, 256.0, 1.0 - roughness));  // Smoother surface has higher shininess
    vec3 specularColor = lightColor * specular;

    // Color based on smoothed layer value
    vec3 color = baseColor*lighting; // Resulting color: black to white gradient

    //vec3 color = (layer < threshold) ? vec3(1.0, 1.0, 1.0) : vec3(0.0, 0.0, 0.0);
    gl_FragColor = vec4(color, 1.0);
    // gl_FragColor = vec4(vec3(1.0) * visibilityFactor, 1.0);
}
