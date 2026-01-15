const DockerSandbox = require('./dockerSandbox');
const logger = require('../utils/logger');

class CodeExecutionService {
    /**
     * Execute code using local Docker Sandbox
     * @param {string} language 
     * @param {string} code 
     */
    static async execute(language, code) {
        try {
            const mappedLang = this.mapLanguage(language);

            const result = await DockerSandbox.run(mappedLang, code);

            return {
                success: result.success,
                output: result.output || result.error, // Return error in output if failed
                statusCode: result.statusCode || (result.success ? 0 : 1)
            };

        } catch (error) {
            logger.error('Code execution failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Map frontend language names to Sandbox runtimes
     */
    static mapLanguage(lang) {
        const map = {
            'javascript': 'javascript',
            'js': 'javascript',
            'node': 'javascript',
            'python': 'python',
            'py': 'python',
            'cpp': 'cpp',
            'c++': 'cpp'
        };

        return map[lang.toLowerCase()] || lang.toLowerCase();
    }
}

module.exports = CodeExecutionService;
