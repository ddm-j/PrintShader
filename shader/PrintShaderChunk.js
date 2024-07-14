import { loadShader } from "../utils.js";

export default async function setupShader() {
    const normalCalculationCode = await loadShader("../shader/PrintShaderChunk.glsl");
    const PrintNormalShader = {
        normalCalculation: normalCalculationCode
    };

    // console.log("Shader loaded successfully.");
    // console.log(PrintNormalShader.normalCalculation);

    return PrintNormalShader;
}