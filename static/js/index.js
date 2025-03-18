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
const overlayEditor = document.getElementById('displayContent');




// first render with default markdown sheet
window.addEventListener("DOMContentLoaded",function(){
    updateMarkdownOutput();

    // geogebra api initialisation
    //initGGBApplet()

    // Fetch the components database and generate the menu on page load
    fetchComponentsDB();

    initImageImportButton();

    initOverlayEditor();


    // Set markdown options
    marked.use({
        async: false,
        pedantic: false,
        gfm: true,
        breaks : true
    });

})
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

    paths.forEach(path => {
        ctx.beginPath();
        ctx.moveTo(path.x, path.y);
        for (let i = 1; i < path.length; i++) {
            ctx.lineTo(path[i].x, path[i].y);
        }
        ctx.stroke();

    });
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

function updateMarkdownOutput() {
    const markdownText = markdownInput.value;
    markdownOutput.innerHTML = marked.parse(markdownText);
}


// not used anymore as we have the overlay
/*markdownInput.addEventListener('input', function(){
    updateMarkdownOutput();
    // update overlay editor content
    const content = markdownInput.value;
    overlayEditor.innerHTML = hideImageSrc(content);
});*/



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


/*replace all images sourced on a web URL to their base64 content representation*/
async function replaceImageUrlsWithBase64() {
    const parser = new DOMParser();
    const doc = parser.parseFromString(markdownInput.value, 'text/html');
    const images = doc.querySelectorAll('img[src^="http"]');

    const canvas = document.getElementById("canvasImageSrcTransformation");
    const ctx = canvas.getContext('2d');

    for (const img of images) {
        try {
            const newImg = new Image();
            newImg.crossOrigin = "anonymous"; // Allow cross-origin images
            let src = encodeURIComponent(img.src);
            newImg.src = `https://api.allorigins.win/get?url=${src}`;

            newImg.onload = function () {
                canvas.width = newImg.naturalWidth;
                canvas.height = newImg.naturalHeight;
                ctx.drawImage(newImg, 0, 0);
                
                let base64Image = canvas.toDataURL("image/png");
                img.src = base64Image;
                markdownInput.value = doc.body.innerHTML;
            };

            newImg.onerror = function () {
                console.error(`Failed to load image: ${img.src}`);
            };
        } catch (error) {
            console.error(`Error processing image ${img.src}:`, error);
        }
    }
}


downloadPDF.addEventListener('click', () => {
    /*const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    html2canvas(markdownOutput).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 10, 10);
        doc.save('document.pdf');
    });*/

    replaceImageUrlsWithBase64().then(()=>{
        updateMarkdownOutput();
        html2pdf(markdownOutput);

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
        markdownEditor.style = "flex-direction:column;"
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


overlayEditor.addEventListener('focus', () =>{
    expandElement(markdownEditor);
    // show the editor and output side by side in expanded view
    markdownEditor.style = "flex-direction:row;"
} );

svgEditor.addEventListener('click', () => {
    expandElement(svgEditor);
});

function checkIfnotChildOfExpanded(element){

    var ret = false;

    if(element.classList.contains("expanded")){
        ret = true;
    }else{
        if(element.parentElement != null){
            ret = checkIfnotChildOfExpanded(element.parentElement);
        }
    }

    return ret;

}

document.addEventListener('click', (event) => {
    if (!checkIfnotChildOfExpanded(event.target)){

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

    const markdownImage = `<img alt="figure" src="${svgDataUrl}" width="595pt"> `;
    markdownInput.value += '\n' + markdownImage;
    updateMarkdownOutput();
}


/*IMAGE INSERTION*/

function initImageImportButton(){
    document.getElementById('importImageButton').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    
}

function handleFileSelect(event) {
    const files_list = document.getElementById('fileInput').files;
    for(i=0;i<files_list.length;i++){
        const file = files_list[i];
        console.log(file);
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const imgDataUrl = e.target.result;
                const markdownImage = `<img alt="figure" src="${imgDataUrl}" width="595pt">`;
                const markdownInput = document.getElementById('markdownInput');
                markdownInput.value += '\n' + markdownImage;
                updateMarkdownOutput();
            };
            reader.readAsDataURL(file);
        } else {
            alert('Please select a valid image file.');
        }

    };
    
}



/*GEOGEBRA */


var GGBApi;
var parameters = {
    "appName": "graphing",
    "id": "ggb-element",
    "width": 800,
    "height": 600,
    "showToolBar": true,
    "showAlgebraInput": true,
    "showMenuBar": true,
    appletOnLoad(ggbApi) {
        GGBApi = ggbApi;
    }
};

function initGGBApplet(){
    var GeoGebraApplet = new GGBApplet(parameters, true);
    window.addEventListener("load", function() {
        GeoGebraApplet.inject('ggb-element')
    });


    document.getElementById('export-svg-btn').addEventListener('click', async function() {
        GGBApi.evalCommand('ExportImage("clipboard",true, "transparent", true)');

        setTimeout(() => {
            navigator.clipboard.readText().then((svgData)=>{
                console.log(svgData);
            });
        }, 1000);

    
        const markdownImage = `<img alt="figure" src="${svgDataUrl}" width="595pt"> `;
        const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgData)}`;
        markdownInput.value += '\n' + markdownImage;
        updateMarkdownOutput();
    });
}



/*PREMADE COMPONENTS*/


async function fetchComponentsDB() {
    try {
        const response = await fetch('/static/templates/components_db.json');
        if (response.ok) {
            const componentsDB = await response.json();
            generateMenu(componentsDB);
        } else {
            console.error('Failed to fetch components database:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching components database:', error);
    }
}

function generateMenu(componentsDB) {
    const menu = document.getElementById('menu');
    
    const typeDiv = document.createElement('div');
    typeDiv.classList.add('menu-item');
    typeDiv.innerText = "Composants";
    typeDiv.onmouseover = () => showSubmenu(typeDiv);
    menu.appendChild(typeDiv);

    menu.onmouseleave = () => hideSubmenu(typeDiv);

    const componentTypeSubmenu = document.createElement('div');
    componentTypeSubmenu.classList.add('submenu');
    typeDiv.appendChild(componentTypeSubmenu);

    for (const componentType in componentsDB) {


            const nameDiv = document.createElement('div');
            nameDiv.classList.add('menu-item');
            nameDiv.innerText = componentType;
            nameDiv.onmouseover = () => showSubmenu(nameDiv);
            nameDiv.onmouseout = () => hideSubmenu(nameDiv);
            componentTypeSubmenu.appendChild(nameDiv);

            const componentSubmenu = document.createElement('div');
            componentSubmenu.classList.add('submenu');
            nameDiv.appendChild(componentSubmenu);

        for (const componentName in componentsDB[componentType]) {

            const componentItem = document.createElement('div');
            componentItem.classList.add('submenu-item');
            componentItem.innerText = componentName;
            componentItem.onclick = () => fetchComponent(
                "static"+"/"+
                "templates" +"/"+
                componentType+"/"+
                componentsDB[componentType][componentName]
            );
            componentSubmenu.appendChild(componentItem);

            // close menu after click
            toggleSubmenu(typeDiv);
        }
    }
}

function toggleSubmenu(menuItem) {
    const submenu = menuItem.querySelector('.submenu');
    if (submenu) {
        submenu.style.display = submenu.style.display === 'none' ? 'block' : 'none';
    }
}

function showSubmenu(menuItem) {
    const submenu = menuItem.querySelector('.submenu');
    if (submenu) {
        submenu.style.display = 'block';
    }
}

function hideSubmenu(menuItem) {
    const submenu = menuItem.querySelector('.submenu');
    if (submenu) {
        submenu.style.display = 'none';
    }
}

async function fetchComponent(url) {
    try {
        const response = await fetch(url);
        if (response.ok) {
            const content = await response.text();
            markdownInput.value += '\n\n' + content;
            updateMarkdownOutput();
        } else {
            console.error('Failed to fetch component:', response.statusText);
        }
    } catch (error) {
        console.error('Error fetching component:', error);
    }
}


// Better editor presentation, hiding image sources etc..


// Function to hide image src and replace with placeholder
function hideImageSrc(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = doc.querySelectorAll('img');
    images.forEach((img, index) => {
        const placeholder = document.createElement('img');
        placeholder.id = `${index}`;
        placeholder.classList.add('source-hidden-for-convenience');
        placeholder.textContent = `Img ${index + 1}`;
        img.parentNode.replaceChild(placeholder, img);
    });
    return doc.body.innerHTML;
}

// Function to restore image src
function restoreImageSrc(html, originalHtml) {
    const parser = new DOMParser();
    html.replace("\n","<br>");
    const doc = parser.parseFromString(html, 'text/html');
    const originalDoc = parser.parseFromString(originalHtml, 'text/html');
    const placeholders = doc.querySelectorAll('.source-hidden-for-convenience');
    const originalImages = originalDoc.querySelectorAll('img');
    console.log(originalImages);

    let imgCount = doc.querySelectorAll("img").length;
    placeholders.forEach((placeholder, index) => {
        // do not edit newly inserted images
        //console.log(`${placeholder.id} === ${index} ?`)
        if (placeholder.id === `${index}`) {
            //console.log("oui");
            const img = document.createElement('img');
            img.setAttribute('src', originalImages[index].getAttribute('src'));
            doc.body.replaceChild(img, placeholder);
        }
    });


    // removed images during the overlay modification
    // are automatically deleted as we return the overlay content
    // with the sources added


    //console.log(html);
    // return new html and if we have new images to reduce source from
    // it also returns true if we removed images to avoid weird behaviors
    return [doc.body.innerHTML,imgCount != originalImages.length];
}


function initOverlayEditor(){

    // Sync content from display to textarea on input
    displayContent.addEventListener('input', () => {
        const og_content = markdownInput.value;
        const [new_content, newSourcesToHide] = restoreImageSrc(overlayEditor.innerText,og_content);
        markdownInput.value = new_content;
        
        console.log(new_content);
        updateMarkdownOutput();

        if(newSourcesToHide){
            overlayEditor.textContent = hideImageSrc(markdownInput.value);
        }
    });

    // Initial sync
    overlayEditor.textContent = hideImageSrc(markdownInput.value);
}


/* 
PB : 
- la maj de l'output est chelou, ça ne met plus en forme correctement (wtf ?)
- il faut overlayEditor.textContent = hideImageSrc(markdownInput.value);
 quand on détecte une nouvelle image
- relou, le newsourcestouhide se trigger des qu'on ecris img, pas le temps de mettre la source
*/