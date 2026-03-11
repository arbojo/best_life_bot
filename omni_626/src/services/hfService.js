const { HfInference } = require('@huggingface/inference');

class HFService {
    constructor() {
        this.client = new HfInference(process.env.HF_TOKEN);
        // Modelo por defecto: Llama-3-8B-Instruct (potente y rápido)
        this.model = "meta-llama/Meta-Llama-3-8B-Instruct";
    }

    async generarRespuesta(systemPrompt, userMessage, history = []) {
        try {
            if (!process.env.HF_TOKEN || process.env.HF_TOKEN.includes('TU_HUGGING_FACE')) {
                throw new Error("Hugging Face Token no configurado");
            }

            const messages = [
                { role: "system", content: systemPrompt },
                ...history,
                { role: "user", content: userMessage }
            ];

            const response = await this.client.chatCompletion({
                model: this.model,
                messages: messages,
                max_tokens: 500,
                temperature: 0.7,
            });

            return response.choices[0].message.content;
        } catch (error) {
            console.error("❌ Error en HFService:", error.message);
            throw error;
        }
    }
}

module.exports = new HFService();
