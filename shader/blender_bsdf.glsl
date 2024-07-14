uniform vec3 lightDirection;  // Position of the light source
uniform vec3 viewDirection;   // Position of the camera
uniform float shininess; // Shininess controls the specular highlight size

varying vec3 vNormal;   // Normal vector passed from vertex shader
varying vec3 vPosition; // Position passed from vertex shader

void main() {
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(lightPos - vPosition);
    vec3 viewDir = normalize(viewPos - vPosition);
    
    // Compute the reflection vector
    vec3 reflectDir = reflect(-lightDir, normal);

    // Compute specular strength
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    
    // Assume some white light for simplicity
    vec3 specularColor = vec3(1.0) * spec;  

    // Output the color
    gl_FragColor = vec4(specularColor, 1.0);
}