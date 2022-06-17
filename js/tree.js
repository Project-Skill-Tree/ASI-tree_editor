let childrenCount = {};
let oldTree = [];

// array that takes on all the changes of the tree
let changedTree = [];

let typeTemplates = {
    "items": {
        "name": "item",
        "emoji": "item",
        "link": "https://www.youtube.com/watch?v=PYaixyrzDOk",
        "type": "items",
        "requires": []
    },
    "skills": {
        "icon": "skill",
        "title": "skill",
        "level": 1,
        "goal": ["Edit the data"],
        "frequency": 1,
        "interval": "week",
        "timelimit": 12,
        "xp": 69,
        "category": "new",
        "type": "skills",
        "requires": [],
        "children": []
    },
    "challenges": {
        "goal": [],
        "category": "example",
        "type": "challenges",
        "xp": 420,
        "requires": []
    }
};

// add a new node to the tree UI using the data passed in
function drawNode(data, parentId) {
    if(!data) return;
    let node = document.createElement('li');
    let nodeAncor = document.createElement('a');
    let nodeTitle = document.createElement('span');
    nodeTitle.innerHTML = (data.title || data.name || data.type) + (data.level ? ` ${data.level}` : '');
    node.classList.add('node');
    node.id = `node-${data.id}`;

    nodeAncor.addEventListener('click', function () {
        showcaseData(findNode(changedTree, data.id));
    });

    if (data.type == 'skills') {
        nodeAncor.addEventListener('contextmenu', async function (event) {
            console.log(`creating child of ${data.id}`);
            event.preventDefault();
            let isClone = event.ctrlKey;
            var newNode = {};
            if (isClone && data.type != 'root') {
                newNode = structuredClone(findNode(changedTree, data.id));
                newNode.id = generateUID();
                newNode.children = [];
                newNode.requires = [];
                newNode.level += 1;
                delete newNode.isRoot;
            }
            else {
                newNode = structuredClone(typeTemplates["skills"]);
                newNode.id = generateUID();
            }

            console.log(`drawing new node`);
            console.log(newNode);

            addNode(changedTree, data.id, newNode);
            drawNode(newNode, data.id);

            return false;
        });
    }

    nodeAncor.appendChild(nodeTitle);
    node.appendChild(nodeAncor);


    if (!parentId && parentId !== 0) {
        document.querySelector('.tree').appendChild(node);
        return;
    }

    let parentNode = document.getElementById(`node-${parentId}-ul`);

    if (!parentNode) {
        let ul = document.createElement('ul');
        ul.id = `node-${parentId}-ul`;
        console.log(parentId)
        document.getElementById(`node-${parentId}`).appendChild(ul);
    }

    document.getElementById(`node-${parentId}-ul`).appendChild(node);
}

// adds a new node to the tree
function addNode(tree, parentId, newNodeData) {
    let parent = findNode(tree, parentId);
    if (parent) {
        if (!parent.children && parent.children != []) parent.children = [];
        if (!parent.requires && parent.requires != []) parent.requires = [];
        parent.children.push(newNodeData.id);
        newNodeData.requires = [parentId];
        changedTree.push(newNodeData);
        saveTree();
    }
    else {
        console.log(`No parent found for ${parentId}`);
    }
}

// iterates through the node's children and draws them all using the drawNode function
function drawChildren(list, parent) {
    if (!parent.children) return;
    parent.children.forEach(child => {
        let childData = findNode(list, child);
        drawNode(findNode(list, child), parent.id);
        if (childData) {
            drawChildren(list, childData);
        }
    });
}

// removes a node from the UI and tree
function deleteNode(list, nodeId) {
    let node = findNode(list, nodeId);

    if (!node.requires || node.requires.length == 0) {
        document.querySelector(`#node-${nodeId}`).remove();
        return;
    }

    // delete children
    if (node.children) {
        deleteChildren(list, nodeId);
    }

    // remove child reference from parent
    let parentId = document.getElementById(`node-${node.id}`).parentElement.getAttribute('id');
    parentId = parentId.replace('node-', '');
    parentId = parentId.replace('-ul', '');

    let parentIndex = findNodeIndex(list, parentId);
    if (parent) {
        list[parentIndex].children = list[parentIndex].children.filter(child => child != nodeId);
    }

    document.querySelector(`#node-${nodeId}`).remove();
    window.localStorage.setItem('tree', JSON.stringify(list));
    list.splice(findNodeIndex(list, nodeId), 1);
}

// wipes and entire node's family from the UI and tree. Basically goes through all the children and the children's children etc. and removes them
function deleteChildren(list, nodeId) {
    let node = findNode(list, nodeId);
    if (node.children) {
        node.children.forEach(child => {
            deleteChildren(list, child);
            let nodeIndex = findNodeIndex(list, child);
            list.splice(nodeIndex, 1);
        });
    }
}

// init command that initalizes the whole tree
async function init(tree) {
    // check if the user has their credentials stored in local storage, if not, prompt the user to input them
    if (!tree && (!window.localStorage.getItem('api_url') || !window.localStorage.getItem('api_key'))) {
        var varModal = new bootstrap.Modal(
            '#variablesModal',
            {
                backdrop: 'static', // we don't want to dismiss Modal when Modal or backdrop is the click event target
                keyboard: false // we don't want to dismiss Modal on pressing [Esc] key
            }
        );
        varModal.show();
        return;
    }

    let data = tree || await getAllNodes();


    oldTree = tree || formatAPIToEditor(data);
    changedTree = structuredClone(oldTree);

    console.log("initializing tree")

    // draw the tree
    let roots = getRoots(changedTree);
    // clear the current tree, if there is one
    document.querySelector('.tree').innerHTML = '';
    roots.forEach(root => {
        drawNode(root);
        drawChildren(changedTree, root);
    });
}

function showError(message) {
    let errorModal = new bootstrap.Modal('#errorModal');
    errorModal.show();

    document.querySelector('#error-message').innerHTML = message;
}

function getRoots(list) {
    let root = list.filter(item => item.isRoot);

    return root ? root : null;
}

// returns a node from a tree based on the id (the actual data is returned, not the index)
function findNode(list, id) {
    let node = list.find(item => item.id == id);
    if (node) {
        return node;
    }
    return null;
}

// search for the index of a node in the list by id (only the index of the node is returned)
function findNodeIndex(list, id) {
    let index = list.findIndex(item => item.id == id);
    if (index > -1) {
        return index;
    }
    return null;
}

// display the data of the node that was clicked on the right hand side of the screen
function showcaseData(data) {
    // copy the data from the template to data-inputs
    let skillEditor = document.querySelector('#data-inputs');
    let templateData = document.querySelector(`#node-edit-template`);
    skillEditor.innerHTML = templateData.innerHTML;
    let editFields = skillEditor.querySelector('.edit-fields');


    editFields.innerHTML = '';
    editFields.setAttribute('data-id', data.id);
    skillEditor.querySelector('#node-type').value = data.type;
    skillEditor.querySelector('#node-type').addEventListener('change', function () {
        let type = skillEditor.querySelector('#node-type').value;
        editFields.innerHTML = '';
        let newData = structuredClone(typeTemplates[type]);
        newData.children = data.children;
        newData.id = data.id;
        newData.requires = data.requires;
        showcaseData(newData);
        saveShowcasedNode(newData);
    });

    for (let field in data) {
        // skip over the fields that are handled by the app automatically or have a separate UI
        if (['type', 'children', 'requires', 'goal'].includes(field)) continue;
        let label = document.createElement('label');
        label.setAttribute('for', `${field}`);
        label.innerHTML = field;
        let input = document.createElement('input');
        if (field == 'id') {
            input.setAttribute('readonly', 'readonly');
        }
        let nodeTypeToField = {
            'string': 'text',
            'number': 'number',
            'boolean': 'checkbox'
        }

        input.addEventListener('change', function () {
            saveShowcasedNode();
        });

        input.setAttribute('type', nodeTypeToField[typeof data[field]]);
        input.setAttribute('name', field);
        input.setAttribute('value', data[field]);
        input.setAttribute('placeholder', field);
        input.setAttribute('id', `node-${field}`);
        skillEditor.querySelector(`.edit-fields`).appendChild(label);
        skillEditor.querySelector('.edit-fields').appendChild(input);
    }
}

// update the tree data with the new data after pressing the save button
function saveShowcasedNode() {
    let id = document.querySelector('.edit-fields').getAttribute('data-id');
    let data = structuredClone(findNode(changedTree, id));
    let newData = {};
    newData.id = data.id;
    newData.requires = data.requires;
    if(data.children) newData.children = data.children
    if(data.goal) newData.goal = data.goal 

    let inputs = document.querySelectorAll('.edit-fields input');
    inputs.forEach(input => {
        newData[input.name] = input.type == "number" ? parseInt(input.value) : input.value;
    });
    newData.type = document.querySelector('#node-type').value;

    // data.children = findNode(changedTree, data.id).children;
    updateNode(id, newData);
}

// update a node in the UI tree once the title is changed
function updateNode(id, data) {
    let node = document.getElementById(`node-${id}`);
    if (node) {
        changedTree[findNodeIndex(changedTree, id)] = data;
        node.querySelector('span').innerHTML = (data.title || data.name || data.type) + (data.level ? ` ${data.level}` : '');
        saveTree();
    }
    else {
        console.log(`No node found for ${id}`);
    }
}

// shows the data inside the export modal (will be removed in near future since we don't need it)
function displayJson() {
    let json = JSON.stringify(changedTree);
    document.querySelector('#json-output').value = json;
    document.querySelector('#exportAPILink').value = window.localStorage.getItem('api_url');
    document.querySelector('#exportAPIKey').value = window.localStorage.getItem('api_key');
    return json;
}

// takes the input from the json input textarea and parses it into the tree then calls the init function to render the tree with that new data
function loadJson() {
    document.querySelector('.tree').innerHTML = "";
    let json = document.querySelector('#json-input').value;
    let data = JSON.parse(json);
    init(data);
}

// loading the tree from local storage
function loadLastSession() {
    let tree = window.localStorage.getItem('tree');
    document.querySelector('.tree').innerHTML = "";
    if (tree) {
        init(JSON.parse(tree));
    }
    else {
        console.log('No tree found');
    }
}

// function used to save the tree to local storage
function saveTree() {
    window.localStorage.setItem('tree', JSON.stringify(changedTree));
}

// function used to save the API URL and API key to local storage for later use
function updateVariables() {
    let apiUrl = document.querySelector('#editAPIURL').value;
    let apiKey = document.querySelector('#editAPIKey').value;

    if (!apiKey || !apiUrl) return;

    window.localStorage.setItem('api_url', apiUrl);
    window.localStorage.setItem('api_key', apiKey);
    var varModal = bootstrap.Modal.getInstance('#variablesModal');
    varModal.hide();
    init();
}

// goes through two lists and finds the differences between them, used for finding changes in the tree which will be sent to the API
function findAllChangedNodes(oldList, newList) {
    let changedNodes = [];
    // console.log(oldList);
    newList.forEach(newNode => {
        let oldNode = oldList.find(oldNode => oldNode.id == newNode.id);
        if (oldNode) {
            if (!isEqualJson(newNode, oldNode)) {
                newNode.isNew = false;
                changedNodes.push(newNode);
            }
        }
        else {
            newNode.isNew = true;
            changedNodes.push(newNode);
        }
    });
    return changedNodes;
}

document.querySelector("#editor-expand").addEventListener('click', () => {
    let editor = document.querySelector('#node-editor');
    editor.classList.add('expanded');
});

document.querySelector("#editor-close").addEventListener('click', () => {
    let editor = document.querySelector('#node-editor');
    editor.classList.remove('expanded');
});

document.querySelector("#jsonInputModal").addEventListener('shown.bs.modal', () => {
    if (window.localStorage.getItem('tree')) {
        document.querySelector('.json-input_last-session-container').style.display = "block";
    }
})

document.querySelector("#variablesModal").addEventListener('shown.bs.modal', () => {
    document.querySelector('#editAPIURL').value = window.localStorage.getItem('api_url');
    document.querySelector('#editAPIKey').value = window.localStorage.getItem('api_key');
});

document.querySelector("#jsonOutputModal").addEventListener('shown.bs.modal', () => {
    let data = displayJson();

    // let newData = findAllChangedNodes(oldTree, changedTree);

    // document.querySelector("#updateAPIBtn").addEventListener('click', () => {
    //     let xhr = new XMLHttpRequest();

    //     newData.forEach(node => {
    //         xhr.open('PUT', 'http://localhost:3000/');
    //         xhr.setRequestHeader('Content-Type', 'application/json');
    //         xhr.send(JSON.stringify(node));
    //     });
    // });
});