let currentFileContent = '';
let lastSelectedFileHandle = null;
let globalDirectoryHandle = null;


// Fonction pour demander l'accès à un dossier
async function requestDirectoryAccess() {
    try {
        const directoryHandle = await window.showDirectoryPicker();
        return directoryHandle;
    } catch (err) {
        console.error('Error requesting directory access:', err);
    }
}

// Fonction pour obtenir un accès permanent à un dossier
async function getPermanentDirectoryAccess(directoryHandle) {
    if (await directoryHandle.queryPermission() === 'granted') {
        return directoryHandle;
    }
    if (directoryHandle.queryPermission() === 'prompt') {
        const permission = await directoryHandle.requestPermission();
        if (permission === 'granted') {
            return directoryHandle;
        }else{
        }
    }

    console.error('Permission denied for permanent access.');
    return null;
}

// Fonction pour créer un sous-dossier
async function createSubDirectory(directoryHandle, subDirName) {
    try {
        const subDirHandle = await directoryHandle.getDirectoryHandle(subDirName, { create: true });
        return subDirHandle;
    } catch (err) {
        console.error('Error creating sub-directory:', err);
    }
}

// Fonction pour lister les fichiers dans un dossier
async function listFiles(directoryHandle) {
    try {
        const entries = [];
        for await (const entry of directoryHandle.values()) {
            entries.push(entry);
        }
        return entries;
    } catch (err) {
        console.error('Error listing files:', err);
    }
}

// Fonction pour lire un fichier
async function readFile(fileHandle) {
    try {
        const file = await fileHandle.getFile();
        const text = await file.text();
        return text;
    } catch (err) {
        console.error('Error reading file:', err);
    }
}

// Fonction pour écrire dans un fichier
async function writeFile(directoryHandle, fileHandle, newContent) {
    try {
        const currentFile = await fileHandle.getFile();
        const currentContent = await currentFile.text();

        if (currentContent !== newContent) {
            const writable = await fileHandle.createWritable({ keepExistingData: false});
            try{
                await writable.write(newContent);
                console.log('File updated successfully.');

            }finally{
                await writable.close();
            }
        } else {
            console.log('No changes detected, skipping file write.');
        }
    } catch (err) {
        console.error('Error writing file:', err);
        throw err;
    }
}


// Function to list Markdown files and update the tabs
async function listMarkdownFilesAndUpdateTabs(markdownInput) {
    const directoryHandle = await checkDirectoryAccess();

    try {
        const tabsContainer = document.getElementById('workspaceTabsContainer');
        tabsContainer.innerHTML = ''; // Clear existing tabs

        for await (const entry of directoryHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.md')) {
                const tab = createTab(entry); 
                tab.addEventListener("click", async (e) => {

                    try {
                        console.log("Tab clicked:", entry.name || fileHandle.name);
                
                        if (currentFileContent !== '' && lastSelectedFileHandle) {
                            console.log("Saving file:", lastSelectedFileHandle.name);
                            await writeFile(directoryHandle, lastSelectedFileHandle, markdownInput.value);
                        }
                
                        console.log("Reading file:", entry.name || fileHandle.name);
                        currentFileContent = await readFile(entry || fileHandle);
                
                        markdownInput.value = currentFileContent;
                        syncOverlayEditor();
                        updateMarkdownOutput();
                
                        lastSelectedFileHandle = entry || fileHandle;
                    } catch (error) {
                        console.error("Error during tab click handling:", error);
                        alert("An error occurred. See console for details.");
                    }
                });

                tabsContainer.appendChild(tab);
            }
        }
    } catch (err) {
        console.error('Error listing Markdown files:', err);
    }
}

async function checkDirectoryAccess() {
    if (globalDirectoryHandle) {
        return globalDirectoryHandle;
    }
    const directoryHandle = await requestDirectoryAccess();
    if (directoryHandle) {
        const permanentDirectoryHandle = await getPermanentDirectoryAccess(directoryHandle);
        if (permanentDirectoryHandle) {
            globalDirectoryHandle = permanentDirectoryHandle;
            return globalDirectoryHandle;
        }
    }
    return null;
}



async function createNewFileAndAddTab() {
    const directoryHandle = await checkDirectoryAccess();

    const fileName = prompt('Enter the name of the new file (with .md extension):');
    if (fileName && fileName.endsWith('.md')) {
        const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
        await writeFile(directoryHandle, fileHandle, '# New File');
        
        const tabsContainer = document.getElementById('workspaceTabsContainer');
        const tab = createTab(fileHandle);
        tab.addEventListener("click", async (e) => {
            try {
                console.log("Tab clicked:", fileName);
        
                if (currentFileContent !== '' && lastSelectedFileHandle) {
                    console.log("Saving file:", lastSelectedFileHandle.name);
                    await writeFile(directoryHandle, lastSelectedFileHandle, currentFileContent);
                }
        
                console.log("Reading file:", fileName );
                currentFileContent = await readFile(fileHandle);
        
                markdownInput.value = currentFileContent;
                syncOverlayEditor();
                updateMarkdownOutput();
        
                lastSelectedFileHandle = fileHandle;
            } catch (error) {
                console.error("Error during tab click handling:", error);
                alert("An error occurred. See console for details.");
            }
        });

        tabsContainer.appendChild(tab);
        tab.click(); // Simulate a click to switch to the new tab
    } else {
        alert('Please enter a valid file name with a .md extension.');
    }
}

// Function to create a tab element
function createTab(fileHandle) {

    const tab = document.createElement('div');
    tab.className = 'workspace-tab';
    tab.innerHTML = `<h3>${fileHandle.name}</h3>`;
    tab.addEventListener('click', async () => {
        // Deselect the last selected tab
        if (lastSelectedFileHandle) {
            const lastSelectedTab = document.querySelector(`.workspace-tab[data-file-handle="${lastSelectedFileHandle.name}"]`);
            if (lastSelectedTab) {
                lastSelectedTab.classList.remove('selected');
            }
        }

        // Select the current tab
        tab.classList.add('selected');
        tab.setAttribute('data-file-handle', fileHandle.name);

        // Read the file content and store it in the variable
        currentFileContent = await readFile(fileHandle);
        lastSelectedFileHandle = fileHandle;

        console.log('Current file content:', currentFileContent);
    });
    return tab;
}

// Exemple d'utilisation
async function test(){
    const directoryHandle = await requestDirectoryAccess();
    if (directoryHandle) {
        const permanentDirectoryHandle = await getPermanentDirectoryAccess(directoryHandle);
        if (permanentDirectoryHandle) {
            // Créer un sous-dossier
            const subDirHandle = await createSubDirectory(permanentDirectoryHandle, 'sous-dossier');

            // Lister les fichiers dans le sous-dossier
            const files = await listFiles(subDirHandle);
            console.log('Files in sub-directory:', files);

            // Écrire dans un fichier
            await writeFile(subDirHandle, 'example.txt', 'Hello, World!');

            // Lire le fichier
            const fileHandle = await subDirHandle.getFileHandle('example.txt');
            const fileContent = await readFile(fileHandle);
            console.log('File content:', fileContent);
        }
    }
}


window.addEventListener('beforeunload', (event) => {
    console.warn('>> Page is about to unload or reload.');
    event.preventDefault();
    event.returnValue = ''; // Pour certains navigateurs (alerte de confirmation)
});