import * as pdfjsLib from 'pdfjs-dist/webpack';
import { CreateMLCEngine } from ' "https://esm.run/@mlc-ai/web-llm"';


document.getElementById('pdfInput').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file) {
        await performOCR(file);
    }
});

async function performOCR(pdfFile) {
    
    // Load the PDF file
    const pdf = await pdfjsLib.getDocument(pdfFile).promise;
    let textContent = '';

    // Iterate through each page and extract text
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContentPage = await page.getTextContent();
        const pageText = textContentPage.items.map(item => item.str).join(' ');
        textContent += pageText + '\n';
    }

    // Initialize the MLCEngine with the SmolVLM-500M-Instruct model
    const engine = await CreateMLCEngine('HuggingFaceTB/SmolVLM-500M-Instruct');

    // Process the extracted text with the LLM
    const messages = [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'user', content: `Convert the following text to markdown format:\n${textContent}` },
    ];

    const reply = await engine.chat.completions.create({ messages });
    const markdownResult = reply.choices[0].message.content;

    // Fill the textarea with the markdown result
    document.getElementById('markdownInput').value = markdownResult;
}
