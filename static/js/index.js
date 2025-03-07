const markdownInput = document.getElementById('markdownInput');
const markdownOutput = document.getElementById('markdownOutput');
const drawingCanvas = document.getElementById('drawingCanvas');
const ctx = drawingCanvas.getContext('2d');
const insertButton = document.getElementById('insertButton');
const eraserButton = document.getElementById('eraserButton');
const clearButton = document.getElementById('clearButton');
const colorPicker = document.getElementById('colorPicker');
const radiusPicker = document.getElementById('radiusPicker');
const downloadMarkdown = document.getElementById('downloadMarkdown');
const downloadPDF = document.getElementById('downloadPDF');
const mainContainer = document.getElementById('mainContainer');
const expandCanvasButton = document.getElementById('expandCanvasButton');
const markdownEditor = document.querySelector('.markdown-editor');
const svgEditor = document.querySelector('.svg-editor');




let isDrawing = false;
let isErasing = false;
let isPanning = false;
let lastX = 0, lastY = 0;
let offsetX = 0, offsetY = 0;
let scale = 1;
let paths = [];
let currentPath = [];
let currentColor = '#000000';
let currentRadius = 5;
let canvasWidth = 2000;
let canvasHeight = 2000;

drawingCanvas.width = canvasWidth;
drawingCanvas.height = canvasHeight;
drawingCanvas.style.cursor = 'crosshair';

drawingCanvas.addEventListener('mousedown', (event) => {
    if (event.button === 1) {
        isPanning = true;
        lastX = event.clientX;
        lastY = event.clientY;
        drawingCanvas.style.cursor = 'grab';
    } else {
        startDrawing(event);
    }
});

drawingCanvas.addEventListener('mousemove', (event) => {
    if (isPanning) {
        event.preventDefault();
        let dx = event.clientX - lastX;
        let dy = event.clientY - lastY;
        drawingCanvas.scrollLeft -= dx;
        drawingCanvas.scrollTop -= dy;
        lastX = event.clientX;
        lastY = event.clientY;
    } else {
        draw(event);
    }
});

drawingCanvas.addEventListener('mouseup', () => {
    stopDrawing()
});

drawingCanvas.addEventListener('mouseout', () => {
    stopDrawing()
});

drawingCanvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const zoomFactor = event.deltaY * -0.001;
    scale = Math.min(Math.max(0.5, scale + zoomFactor), 3);
    drawingCanvas.style.transform = `scale(${scale})`;
    drawingCanvas.style.transformOrigin = 'top left';
    drawingCanvas.style.overflow = 'auto';
});

eraserButton.addEventListener('click', () => {
    isErasing = !isErasing;
});

clearButton.addEventListener('click', () => {
    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    paths = [];
});

colorPicker.addEventListener('input', () => {
    currentColor = colorPicker.value;
});

radiusPicker.addEventListener('input', () => {
    currentRadius = radiusPicker.value;
});

expandCanvasButton.addEventListener('click', () => {
    drawingCanvas.width += 1000;
    drawingCanvas.height += 1000;
    redrawPaths();
});

// re-affiche le svg apres aggrandissement du canvas
function redrawPaths() {
    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    ctx.beginPath();
    paths.forEach(path => {
        ctx.moveTo(path.x, path.y);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
    });
    ctx.stroke();
}

function getCanvasCoords(event) {
    const rect = drawingCanvas.getBoundingClientRect();
    return {
        x: (event.clientX - rect.left) * (drawingCanvas.width / rect.width),
        y: (event.clientY - rect.top) * (drawingCanvas.height / rect.height)
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
    ctx.globalCompositeOperation = isErasing ? 'destination-out' : 'source-over';
    ctx.lineWidth = isErasing ? currentRadius * 2 : currentRadius;
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

// state of both markdown editor and canvas editor
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
        drawingCanvas.classList.remove("expanded")
        markdownInput.classList.remove("expanded");
        markdownOutput.classList.remove("expanded");

        // delay to prevent having expansion of an element while clicking to collapse another
        setTimeout(() => {
            isExpanded = false; 
            // prevent focus to be made on markdown editor
            // and by so having to unfocus and refocus it to zoom in it
            // if we are coming from drawing canvas
            markdownInput.blur();
            }, 200);    
    }
}


markdownInput.addEventListener('focus', () =>{
    expandElement(markdownEditor)
} );

document.addEventListener('click', (event) => {
    console.log(event);
    if (!(event.target.classList.contains('expanded') || event.target.parentElement.classList.contains("expanded"))){
        collapseElement();
    }
});



// svg insertion in markdown
insertButton.addEventListener('click', insertSVG);

function insertSVG() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', drawingCanvas.width);
    svg.setAttribute('height', drawingCanvas.height);
    svg.setAttribute('viewBox', `0 0 ${drawingCanvas.width} ${drawingCanvas.height}`);

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