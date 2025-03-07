const markdownInput = document.getElementById('markdownInput');
const markdownOutput = document.getElementById('markdownOutput');
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const insertButton = document.getElementById('insertButton');
const eraserButton = document.getElementById('eraserButton');
const clearButton = document.getElementById('clearButton');
const colorPicker = document.getElementById('colorPicker');
const radiusPicker = document.getElementById('radiusPicker');
const downloadMarkdown = document.getElementById('downloadMarkdown');
const downloadPDF = document.getElementById('downloadPDF');

canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight - insertButton.offsetHeight;

let isDrawing = false;
let isErasing = false;
let paths = [];
let currentPath = [];
let currentColor = '#000000';
let currentRadius = 5;

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

eraserButton.addEventListener('click', () => {
    isErasing = !isErasing;
    canvas.style.cursor = isErasing ? 'crosshair' : 'crosshair';
});

clearButton.addEventListener('click', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    paths = [];
});

colorPicker.addEventListener('input', () => {
    currentColor = colorPicker.value;
});

radiusPicker.addEventListener('input', () => {
    currentRadius = radiusPicker.value;
});

function getCanvasCoords(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
}

function startDrawing(event) {
    isDrawing = true;
    currentPath = [];
    const { x, y } = getCanvasCoords(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = isErasing ? '#ffffff' : currentColor;
    ctx.lineWidth = currentRadius;
    ctx.lineCap = 'round';
    currentPath.push({ x, y, type: 'move', color: ctx.strokeStyle, radius: ctx.lineWidth });
}

function draw(event) {
    if (!isDrawing) return;
    const { x, y } = getCanvasCoords(event);
    if (isErasing) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = currentRadius * 2;
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineWidth = currentRadius;
    }
    ctx.lineTo(x, y);
    ctx.stroke();
    currentPath.push({ x, y, type: 'line', color: ctx.strokeStyle, radius: ctx.lineWidth });
}

function stopDrawing() {
    isDrawing = false;
    paths.push(currentPath);
    ctx.closePath();
    ctx.globalCompositeOperation = 'source-over';
}

insertButton.addEventListener('click', insertSVG);

function insertSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', canvas.width);
    svg.setAttribute('height', canvas.height);
    svg.setAttribute('viewBox', `0 0 ${canvas.width} ${canvas.height}`);

    paths.forEach(path => {
        let d = '';
        let color = '#000';
        let radius = 1;
        path.forEach(point => {
            if (point.type === 'move') {
                d += `M${point.x} ${point.y} `;
                color = point.color;
                radius = point.radius;
            } else if (point.type === 'line') {
                d += `L${point.x} ${point.y} `;
            }
        });
        const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        pathElement.setAttribute('d', d);
        pathElement.setAttribute('stroke', color);
        pathElement.setAttribute('stroke-width', radius);
        pathElement.setAttribute('fill', 'none');
        svg.appendChild(pathElement);
    });

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

    const markdownImage = `![Dessin](${svgDataUrl})`;
    markdownInput.value += '\n' + markdownImage;
    updateMarkdownOutput();
}

markdownInput.addEventListener('input', updateMarkdownOutput);

function updateMarkdownOutput() {
    const markdownText = markdownInput.value;
    markdownOutput.innerHTML = marked.parse(markdownText);
}

downloadMarkdown.addEventListener('click', () => {
    const markdownText = markdownInput.value;
    const blob = new Blob([markdownText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});

downloadPDF.addEventListener('click', () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    html2canvas(markdownOutput).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 10, 10);
        doc.save('document.pdf');
    });
});


/* zoom sur l'éditeur quand on écris/dessine */

const drawingCanvas = document.getElementById('drawingCanvas');
const markdownEditor = document.querySelector('.markdown-editor');
const svgEditor = document.querySelector('.svg-editor');
let isExpanded = false;
let ignoreClick = false;

function expandElement(element) {
    if (!isExpanded) {
        element.classList.add('expanded');
        isExpanded = true;
        ignoreClick = true;
        setTimeout(() => { ignoreClick = false; }, 200); // Small delay to prevent immediate collapse
    }
}

function collapseElement() {
    if (isExpanded && !ignoreClick) {
        markdownEditor.classList.remove('expanded');
        svgEditor.classList.remove('expanded');
        isExpanded = false;
    }
}

markdownInput.addEventListener('focus', () => expandElement(markdownEditor));
drawingCanvas.addEventListener('mousedown', () => expandElement(svgEditor));

document.addEventListener('click', (event) => {
    if (!markdownEditor.contains(event.target) && !svgEditor.contains(event.target)) {
        collapseElement();
    }
});