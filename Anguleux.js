const $_anguleuxInterne = {

    bindingMap: {},
    forRegistry: [],
    forReprocessNeeded: false

};

$_anguleuxInterne.initAnguleux = () => {
    $_anguleuxInterne.initElements();
    $_anguleuxInterne.initTemplating();
    $_anguleuxInterne.initDataBinding();
};

$_anguleuxInterne.initElements = () => {
    $_anguleuxInterne.dataBindElements = document.querySelectorAll('*[data-bind]');
    $_anguleuxInterne.agForElements = document.querySelectorAll("*[ag-for]");
    $_anguleuxInterne.agTemplateElements = document.querySelectorAll("*[ag-template=true]");
    $_anguleuxInterne.agTemplateDisabled = document.querySelectorAll("*[ag-template=false]");
};

window.addEventListener("load", $_anguleuxInterne.initAnguleux);

/**
 * Resolves an object path string (Object.Property.NestedProperty.DestinationProperty)
 * starting from the root object and will (always) return a reference to the object one level
 * above the DestinationProperty. The rootObject must NOT be included in the path!
 * If the path is only one level deep, the root object will be returned
 * @param rootObject Object
 * @param objectPath string
 * @returns Object
 */
$_anguleuxInterne.resolveObjectPathMoz = (rootObject, objectPath) => {
    let arr = objectPath.split('.');
    while (arr.length-1) {
        rootObject = rootObject[arr.shift()];
    }
    return rootObject;
};

/**
 * Gets the last element of the object path (DestinationProperty)
 * @param objectPath
 */
$_anguleuxInterne.getDestinationName = (objectPath) => {
    return objectPath.split(".").pop();
};

window.$scope = {

    a: {
        b: {
            table: ["http://google.ca", "http://bing.com", "http://yahoo.ca", "http://duckduckgo.org"],
            destination: "destinationPropertyValue",
            bool: false
        }
    },
    tUsers: [
        {
            name: "test",
            lastName: "test",
            tSessions: [true, true, false]
        }
    ]
};

/**
 *
 * @param element
 * @param init
 */
$_anguleuxInterne.bindElement = (element, init) => {
    let strAttrDataBind = element.getAttribute("data-bind");
    let strBinAttrTemplate = element.getAttribute("ag-template");
    if(element instanceof HTMLInputElement){
        if(init){
            if(element.type === "checkbox"){
                element.checked = element.$_objRef[$_anguleuxInterne.getDestinationName(strAttrDataBind)];
            }else{
                element.value = element.$_objRef[$_anguleuxInterne.getDestinationName(strAttrDataBind)];
            }
        }else{
            if(element.type === "checkbox"){
                element.$_objRef[$_anguleuxInterne.getDestinationName(strAttrDataBind)] = element.checked;
            }else{
                element.$_objRef[$_anguleuxInterne.getDestinationName(strAttrDataBind)] = element.value;
            }
        }
    }
    if(!(element instanceof HTMLInputElement)){
        if(strBinAttrTemplate === "true"){
            $_anguleuxInterne.handleTemplating(element);
        }else{
            element.innerHTML = element.$_objRef[$_anguleuxInterne.getDestinationName(strAttrDataBind)];
        }
    }
};

/**
 *
 * @param element HTMLElement
 * @param init boolean
 */
$_anguleuxInterne.updateBinding = (element, init) => {
    let strAttrDataBind = element.getAttribute("data-bind");
    $_anguleuxInterne.bindElement(element, init);
    $_anguleuxInterne.bindingMap[strAttrDataBind].forEach((x) => $_anguleuxInterne.bindElement(x, init));
};



$_anguleuxInterne.initDataBinding = () => {
    //Get elements and bind them
    $_anguleuxInterne.initElements();
    let arrElements = $_anguleuxInterne.dataBindElements;

    let id = 0;
    for (let key in arrElements) {
        let el = arrElements[key];
        if(el instanceof HTMLElement) {

            let strAttrDataBind = arrElements[key].getAttribute("data-bind");

            el.$_objRef = $_anguleuxInterne.resolveObjectPathMoz($scope, strAttrDataBind);
            el.$_uniqueID = id;

            if(!$_anguleuxInterne.bindingMap[strAttrDataBind])
                $_anguleuxInterne.bindingMap[strAttrDataBind] = [];
            $_anguleuxInterne.bindingMap[strAttrDataBind].push(el);

            el.addEventListener('change', () => $_anguleuxInterne.updateBinding(el));
            el.addEventListener('keydown', () => $_anguleuxInterne.updateBinding(el));
            el.addEventListener('keyup', () => $_anguleuxInterne.updateBinding(el));
            el.addEventListener('mousedown', () => $_anguleuxInterne.updateBinding(el));

            id++;
        }
    }
    //no choice, need to init first time after all ids are present
    for (let key in arrElements) {
        let el = arrElements[key];
        if(el instanceof HTMLElement) {
            $_anguleuxInterne.updateBinding(el, true);
        }
    }
};

/**
 * Handle ag-for attribute.
 * @param element HTMLElement
 */
$_anguleuxInterne.handleAgFor = (element, hide=true) => {
    //Setup working vars
    let strAttrAgFor = element.getAttribute("ag-for");
    let rgxFor = /(.*) in (.*)/g;
    let parsed = rgxFor.exec(strAttrAgFor);
    let strNomVarFor = parsed[1];
    let strNomTable = parsed[2];
    let strNomTableSeul = $_anguleuxInterne.getDestinationName(strNomTable);

    //Setup the for element
    if(hide)
        element.className += " ag-disp-none";

    element.$_objRef = $_anguleuxInterne.resolveObjectPathMoz($scope, strNomTable);

    if(!parsed){return;}
    if(element.$_objRef === undefined){return;}

    //Do the for, generate HTMLElements
    for (let key in element.$_objRef[strNomTableSeul]) {
        let appendedChild = element.parentElement.appendChild(element.cloneNode(true));
        appendedChild.$_objRef = $_anguleuxInterne.resolveObjectPathMoz($scope, (strNomTable+".null"));
        appendedChild.className = appendedChild.className.replace(" ag-disp-none", "");

        element.setAttribute("ag-template", "true");
        $_anguleuxInterne.handleTemplating(appendedChild, (strNomTable+"."+key), strNomVarFor);

        if(appendedChild.querySelector("[double-for=true]"))
            $_anguleuxInterne.handleAgFor(appendedChild.querySelector("[double-for=true]"), false);
    }
};

/**
 * Handle HTML templating for an element
 * @param element HTMLElement
 * @param databind string manual data bind
 * @param manualMatcher string for manual databind
 */
$_anguleuxInterne.handleTemplating = (element, databind = false, manualMatcher) => {
    let rgxOnlyInnerHTML = /(?<=\>)(.*?)({{(?<innerTemplate>.+?)}})/gs;
    let rgxOnlyAttribute = /\S+?=("[^"]*?{{([^}]+?)}}[^"]*?")/g;

    let matches;
    do {
        matches = rgxOnlyInnerHTML.exec(element.outerHTML);
        if (matches) {
            let tmpltName = matches.groups["innerTemplate"];
            let resolvedParentObject = $_anguleuxInterne.resolveObjectPathMoz($scope, tmpltName);
            //replace
            if(databind !== false){ //databind present
                element.outerHTML = element.outerHTML.replace("{{"+manualMatcher+"}}", ("<span data-bind='"+databind+"'>" + resolvedParentObject[$_anguleuxInterne.getDestinationName(databind)] + "</span>"));
                databind = false; //only data bind on the first match
            }else{
                console.log(element.innerHTML);
                console.log(matches[2]);
                element.innerHTML = element.innerHTML.replace(matches[2], ("<span data-bind='"+tmpltName+"'>" + resolvedParentObject[$_anguleuxInterne.getDestinationName(tmpltName)] + "</span>"));
            }

        }
    } while (matches);

    /*
    let attrMatches;
    do{
        let tmpltName = matches[2];
        attrMatches = rgxOnlyAttribute.exec(element.outerHTML);
        if(attrMatches){
            let resolvedParentObject = $_anguleuxInterne.resolveObjectPathMoz($scope, tmpltName);
            let
        }
    }while(matches);
    */
};

$_anguleuxInterne.initTemplating = () => {
    let agForEls = Array.from($_anguleuxInterne.agForElements);
    agForEls.forEach((x) => $_anguleuxInterne.handleAgFor(x));

    if($_anguleuxInterne.forReprocessNeeded === true){
        let agForEls = Array.from($_anguleuxInterne.agForElements);
        agForEls.forEach((x) => $_anguleuxInterne.handleAgFor(x));
    }

    $_anguleuxInterne.initElements();

    let allElements = Array.from($_anguleuxInterne.agTemplateElements).concat(Array.from($_anguleuxInterne.dataBindElements)).concat(agForEls);
    allElements.forEach((x) => $_anguleuxInterne.handleTemplating(x));
};