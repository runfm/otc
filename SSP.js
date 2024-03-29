var CACHE_V = "1:::14.05.2019" /*   Версия файла SSP.JS; 
                                    В омнитрекере в System parameters --> SSP --> CACHE_V прописан такой же атрибут.
                                    Этот атрибут указывает актуальную версию JS файла 
                                    Так как JS файл закачивается на компьютер пользователя, можно легко проверить актуальность кеша на его компьютере.
                                (!) Важно не забывать актуализировать эти строки в JS файле и в System parameters омнитрекера, если были внесены какие то изменения в скрипт 

                                  */

HTMLElement.prototype.createChild = function (params) {
    var child = document.createElement(params.tagName || "div");
    child.hidden = params.hidden || false;
    if (params.focusable)
        child.setAttribute("tabindex", "-1");
    if (params.placeholder)
        child.placeholder = params.placeholder;
    if (params.editable)
        child.setAttribute("contenteditable", true);
    if (params.className)
        child.className = params.className;
    if (params.textContent)
        child.textContent = params.textContent;
    if (params.type)
        child.type = params.type;
    if (params.name)
        child.name = params.name;
    if (params.eventListeners) {
        for (var eventKey in params.eventListeners) {
            var eventData = params.eventListeners[eventKey];
            if (typeof (eventData) === 'function') {
                child.addEventListener(eventKey, eventData);
            }
            if (typeof (eventData) === 'object') {
                child.addEventListener(eventKey, eventData.handler, (eventData.useCapture || false));
            }
        }
    }
    if (params.attributes) {
        for (var attributeKey in params.attributes) {
            child.setAttribute(attributeKey, (params.attributes[attributeKey] || ""));
        }
    }
    if (params.value)
        child.value = params.value;
    if (params.id)
        child.id = params.id;
    if (params.childs) {
        for (var i = 0; i < params.childs.length; i++) {
            child.createChild(params.childs[i]);
        }
    }
    (params.insertBefore) ? this.insertBefore(child, params.insertBefore) : this.appendChild(child);
    if (params.textNode && params.id) {
        var label = document.createElement('label');
        label.htmlFor = params.id;
        label.appendChild(document.createTextNode(params.textNode));
        label.innerHTML = label.textContent
        this.appendChild(label);
    }
    return child;
};

var otCustom = {
    Settings: {
        MultipleChoiceDelimiter: ";",
        ChoiceDefaultTextFrom: "Title",
        ChoiceDefaultValueFrom: "UID",
        RelationsRowDelimiter: ":~~:",
        RelationsKeyValueDelimiter: ":~:",
        GridTextValueDelimiter: ":!~:",
        sfPlaceholder: "Начните набирать текст вашего запроса",
        SSPFieldNamePrefix: "SPOINT_FIELD-"
    },
    Controls: {},
    Form: {
        Fields: {},
        ChoiceData: {},
        OmnitrackerControls: {},
        Storage: "",
        VisibilityRules: {}
    },
    lastCrashedTicket: null
};

otCustom.Form.Redefine = function () {
    this.Fields = {};
    this.ChoiceData = {};
    this.webRequest = {};
    this.InitiatorInfo = {};
    this.OmnitrackerControls = {};
    this.Storage = "";
    this.VisibilityRules = {};
    this.RelationIDs = "";
    otCustom.lastCrashedTicket = null;
    /* primaryStorage && (primaryStorage = null); */
}

otCustom.Form.Close = function () {
    otCustom.Form.Redefine();
    this.disabled = 'disabled';
    save_and_close();
    return HideToolbarMenu(event);
}

Object.defineProperty(otCustom.Form, "description", {
    get: function () {
        for (var key in otCustom.Form.Fields) {
            var fieldData = otCustom.Form.Fields[key];
            if (fieldData.isVisible && !fieldData.isValid) {
                alert(fieldData.validationRule.ErrorMessage)
                return false;
            }
        }
        return true
    }
});
Object.defineProperty(otCustom.Form, "relationsData", {
    get: function () {
        var out = []
        for (var k in otCustom.Form.Fields) {
            var field = otCustom.Form.Fields[k];
            out.push(k + otCustom.Settings.RelationsKeyValueDelimiter + field.value + otCustom.Settings.RelationsKeyValueDelimiter + field.bundleID)
        }
        return out.join(otCustom.Settings.RelationsRowDelimiter)
    }
});

otCustom.Field = function (params) {
    var self = this;
    this.slaveFields = {
        visibility: [],
        filter: []
    };
    this.bundleID = params.bundleID;
    this.fieldID = params.fieldID;
    this.title = params.title;
    this.type = params.type
    this.fieldNames = params.fieldNames
    this.fieldContainer = params.fieldContainer
    this.container = params.container
    this.ChoiceView = params.ChoiceView
    this.validationRule = params.validationRule;
    this.onChangeTrigger = params.onChangeTrigger;
    this.isVisible = (this.fieldContainer) ?  !this.fieldContainer.hidden : true;
    this.placeholder = params.placeholder;
    

    if (params.type == "Choice") {
        this.isMultiple = params.isMultiple;
        this.additionalTextFrom = params.additionalTextFrom
        if (params.dataSource) {
            this.dataSource = params.dataSource
        }
        else {
            if (otCustom.Form.ChoiceData && otCustom.Form.ChoiceData[params.fieldID])
                this.selections = otCustom.Form.ChoiceData[params.fieldID]
            if (params.filterByProperty && params.filterByField) {
                this.dataSource = null;
                this.filterByProperty = params.filterByProperty;
                var masterField = otCustom.Form.Fields[params.filterByField];
                if (masterField) {
                    masterField.slaveFields.filter.push(this);
                    this.dataSource = FilterChoiceItems(masterField, this)
                }
            }
            else
                this.dataSource = this.selections;
        }

    }

    if (params.visibleIfField) {
        var masterField = otCustom.Form.Fields[params.visibleIfField];
        if (masterField) {
            masterField.slaveFields.visibility.push(this);
            this.visibleValues = params.visibleValues;
            CheckVisibility(masterField, this)
        }
    }

    if(params.onChange)
        this.onChange = params.onChange;

    otCustom.Controls[params.type].call(this, this)
};

otCustom.Field.prototype.SetVisibility = function (value) {
    this.fieldContainer.hidden = !value;
    this.isVisible = value
};

(function (Controls) {
    function TimeInput(params) {
        function NumberInput(params) {
            var self = this;
            var enteredString = ""
            var inputElement = params.container.createChild({
                tagName: "input",
                className: "ot-custom-number-input",
                attributes: {
                    maxlength: "2"
                },
                eventListeners: {
                    keydown: function (event) {
                        if (!event.key.match(/\d|Backspace|ArrowLeft|ArrowRight/gmi))
                            event.preventDefault()
                    },
                    keyup: function (event) {
                        var enteredNumber = parseInt(this.value);
                        if (enteredNumber >= params.leadZeroFrom && enteredNumber < 10 && this.value.length == this.getAttribute("maxlength") - 1)
                            this.value = "0" + this.value;
                        if (enteredNumber > params.maxNumber)
                            this.value = params.maxNumber
                        params.onChange && params.onChange(self)
                    },
                    change: function (event) {
                        self.value = parseInt(this.value)
                        params.onChange && params.onChange(self)
                    },
                    click: function (e) {
                        inputElement.value = "";
                    },
                    blur: function (e) {
                        inputElement.value = enteredString;
                    }
                }
            });

            Object.defineProperty(this, "value", {
                set: function (value) {
                    if (value > params.maxNumber)
                        value = params.maxNumber
                    if (isNaN(value) || value === null || value === "")
                        enteredString = ""
                    else
                        enteredString = (value < 10) ? "0" + value : value;
                    inputElement.value = enteredString;
                },
                get: function () {
                    return enteredString;
                }
            });
            Object.defineProperty(this, "disabled", {
                set: function (value) {
                    inputElement.disabled = value
                },
                get: function () {
                    return inputElement.disabled
                }
            });
        }
        var self = this;
        this.hour = 0;
        this.minute = 0;
        var HourInput = new NumberInput({
            container: params.container,
            leadZeroFrom: 3,
            maxNumber: 23,
            onChange: function (inputContext) {
                var value = parseInt(inputContext.value)
                self.hour = (isNaN(value)) ? 0 : value;
                params.onChange(self);
            }
        });

        params.container.createChild({
            tagName: "span",
            textContent: ":"
        });

        var MinuteInput = new NumberInput({
            container: params.container,
            leadZeroFrom: 6,
            maxNumber: 59,
            onChange: function (inputContext) {
                var value = parseInt(inputContext.value)
                self.minute = (isNaN(value)) ? 0 : value;
                params.onChange(self);
            }
        });

        HourInput.value = this.hour;
        MinuteInput.value = this.minute;

        Object.defineProperty(this, "time", {
            get: function () {
                return {
                    hour: this.hour,
                    minute: this.minute,
                    ms: (this.hour * 3600000) + (this.minute * 60000)
                }
            },
            set: function (value) {
                switch (typeof value) {
                    case "object":
                        var hour = (value.hour > 23) ? hour = 23 : value.hour
                        var minute = (value.minute > 59) ? minute = 59 : value.minute
                        break;
                    case "number":
                        var parsedHours = value / 3600000
                        var hour = parseInt(parsedHours);
                        var minute = parseInt((parsedHours - hour) * 60);
                        break;
                }
                HourInput.value = this.hour = hour;
                MinuteInput.value = this.minute = minute;
            }
        });

        Object.defineProperty(this, "disabled", {
            set: function (value) {
                HourInput.disabled = MinuteInput.disabled = value
            },
            get: function () {
                return HourInput.disabled && MinuteInput.disabled
            }
        });

        this.toString = function () {
            var h = (this.hour < 10) ? "0" + this.hour : this.hour;
            var m = (this.minute < 10) ? "0" + this.minute : this.minute;
            return h + ":" + m
        }
    }
    function MonthSetter(params) {
        var self = this;
        var cursorDate = new Date();
        cursorDate.setHours(0, 0, 0, 0)

        this.toString = function () {
            return cursorDate.toLocaleString(otCustom.lang || "ru", { month: 'long' }) + " " + cursorDate.getFullYear();
        }

        Object.defineProperty(this, "next", {
            get: function () {
                cursorDate.setMonth(cursorDate.getMonth() + 1, 1);
                params.onChange(self)
                return self.borders;
            }
        });
        Object.defineProperty(this, "previous", {
            get: function () {
                cursorDate.setMonth(cursorDate.getMonth() - 1, 1);
                params.onChange(self)
                return self.borders;
            }
        });

        Object.defineProperty(this, "borders", {
            get: function () {
                var left = cursorDate.setDate(1);
                var firstWeekDay = cursorDate.getDay() || 7;
                var right = cursorDate.setMonth(cursorDate.getMonth() + 1, 0);
                var lastDate = cursorDate.getDate()
                return {
                    left: left,
                    firstWeekDay: firstWeekDay,
                    right: right,
                    lastDate: lastDate
                }
            }
        });
    }
    function Control(params) {
        var self = this;
        var isValid;
        var value = "";
        var wrapper = params.container.createChild({ className: "ot-custom-wrapper" });
        this.contentContainer = wrapper.createChild(params.creationConfig);
        this.fieldContainer = params.fieldContainer;
        var stateContainer = wrapper.createChild({ className: "ot-custom-state-container" });
        if (params.validationRule && params.validationRule.Type)
            stateContainer.classList.add("ot-custom-mandatory-container")
        Object.defineProperty(this, "isValid", {
            get: function () { return (params.validationRule.Type) ? isValid : true; },
            set: function (value) {
                isValid = value;
                stateContainer.className = "ot-custom-state-container ot-custom-validated-" + value;
            }
        });
        Object.defineProperty(this, "value", {
            get: function () { return value; },
            set: function (valueForSet) {
                value = valueForSet;
                if (params.validationRule && params.validationRule.Type) {
                    if (params.validationRule.Type == "Regex") {
                        var rg = new RegExp(params.validationRule.Query, "gim")
                        self.isValid = !!valueForSet.match(rg)
                    }
                    if (params.validationRule.Type == "Exec") {
                        self.isValid = eval(params.validationRule.Query)
                    }
                }
                if (params.onChange) {
                    params.onChange(self);
                    return
                }
                if (otCustom.onChange)
                    otCustom.onChange(self);
            }
        });


    }

    function DropDown(params) {
        var self = this;
        var dropFactor = 0;
        Control.call(this, {
            fieldContainer: params.fieldContainer,
            container: params.container,
            onChange: params.onChange,
            validationRule: params.validationRule,
            creationConfig: {
                className: "otCustom-container dropDownContainer",
                focusable: true,
                eventListeners: {
                    mouseover: params.onMouseOver,
                    mouseout: params.onMouseOut,
                    focusin: function (e) {
                        self.listWrapper.show();
                    },
                    focusout: function (e) {
                        if (!this.contains(e.relatedTarget)) {
                            self.listWrapper.hide();
                            params.focusout && params.focusout(e);
                        }
                    },
                    click: params.onClick
                }
            }
        });
        var inputWrapper = this.contentContainer.createChild({
            className: "otCustom-input-wrapper dropDownInputWrapper"
        });
        this.selectionContainer = inputWrapper.createChild({ className: "dropDownSelectedItem" });
        inputWrapper.createChild({ className: params.togglerClass || "dropDownToggler" });
        this.listWrapper = this.contentContainer.createChild({
            className: "dropDownListWrapper",
            hidden: true
        });
        this.listWrapper.toggle = function () {
            this.hidden = !this.hidden;
            self.dropFactor = this.hidden;
        }
        this.listWrapper.hide = function () {
            this.hidden = true;
            self.dropFactor = this.hidden;
        }
        this.listWrapper.show = function () {
            this.hidden = false;
            self.dropFactor = this.hidden;
        }
        this.listContainer = this.listWrapper.createChild({ className: "dropDownList" });

        Object.defineProperty(this, "dropFactor", {
            set: function () {
                dropFactor = (self.listWrapper.parentElement.offsetTop + self.listWrapper.clientHeight) * !self.listWrapper.hidden;
                if (params.onToggled)
                    params.onToggled(dropFactor, self);
                if (otCustom.onToggle)
                    otCustom.onToggle(dropFactor, self);
            }
        });
    }

    function ComboBox(params) {
        var self = this;
        var items = [];
        var shownItems = [];
        self.selectedItems = [];
        var hover;
        var readyForClean = false;
        var txt = "";

        var textFrom = params.textFrom || otCustom.Settings.ChoiceDefaultTextFrom || "Title";
        var valueFrom = params.valueFrom || otCustom.Settings.ChoiceDefaultValueFrom || "UID";

        DropDown.call(this, {
            fieldContainer: params.fieldContainer,
            container: params.container,
            onChange: params.onChange,
            onToggled: params.onToggled,
            onClick: function (event) {
                if (event.target.className == "otCustomDropDownTextInput") {
                    event.target.value = "";
                }
                if (hover) {
                    Select(hover.objectData);
                }
            },
            focusout: focusout,
            onMouseOver: onMouseOver,
            validationRule: params.validationRule,
            onMouseOut: function () { self.hover = null; }
        });

        this.contentContainer.addEventListener("mousedown", function (e) {
            hover && Select(hover.objectData); //IE Fix так как в IE глюк с событием onlclick
        });

        var comboTextInput = this.selectionContainer.createChild({
            tagName: "input",
            className: "otCustomDropDownTextInput",
            placeholder: params.placeholder,
            eventListeners: {
                keydown: onKeyDown,
                input: onInput
            }
        });
        var itemsContainer = this.listContainer.createChild({ className: "dropDownListItemsContainer" });
        var itemsState = this.listContainer.createChild({ className: "dropDownListItemsState" });

        this.Set = function (value) {
            if (value) {
                if (typeof value == "number") {

                    var valueObject = items.filter(function (e) {
                        return e['UID'] == value
                    });
                    if (valueObject.length) {
                        Select(valueObject[0])
                        UpdateValue();
                    }
                }
                else {
                    var valuesForSet = value.split(";")
                    for (i = 0; i < valuesForSet.length; i++) {
                        var valueObject = items.filter(function (e) {
                            return e[valueFrom] == valuesForSet[i] || e[textFrom] == valuesForSet[i]
                        });
                        if (valueObject.length) {
                            Select(valueObject[0])
                            UpdateValue();
                        }

                    }
                }
            }
            else {
                Clear();
            }
        }

        function Clear() {
            self.selectedItems = [];
            if (params.isMultiple) {
                while (self.selectionContainer.childElementCount) self.selectionContainer.removeChild(self.selectionContainer.lastChild);
            }
            else {
                txt = comboTextInput.value = "";
            }
            readyForClean = false;
            UpdateValue();
        }

        function Select(selectedItem) {
            if (params.isMultiple) {
                if (self.selectedItems.indexOf(selectedItem) == -1) {
                    self.selectedItems.push(selectedItem);
                    var selectedHTMLElement = self.selectionContainer.createChild({
                        className: "otCustomSelectedOption",
                        textContent: selectedItem[textFrom],
                        insertBefore: comboTextInput
                    });
                    selectedHTMLElement.objectData = selectedItem;
                    readyForClean = true;
                    comboTextInput.value = "";
                }
            }
            else {
                self.selectedItems[0] = selectedItem;
                comboTextInput.value = selectedItem[textFrom];
                txt = selectedItem[textFrom];
                /* self.contentContainer.blur(); */
                self.listWrapper.hide() // фикс для IE, так как в IE не работает HTMLElement.blur()
                UpdateValue(); // фикс для IE, так как в IE не работает HTMLElement.blur()
            }
        }
        function focusout(e) {
            if (params.isMultiple)
                comboTextInput.value = "";
            else
                comboTextInput.value = txt || "";
            if (items && shownItems.length != items.length)
                self.visibleItems = items;
            UpdateValue()
        }

        function UpdateValue() {
            self.text = self.selectedItems.map(function (item) {
                return item[textFrom];
            }).join(otCustom.Settings.MultipleChoiceDelimiter || ";");
            var newValue = self.selectedItems.map(function (item) {
                return item[valueFrom];
            }).join(otCustom.Settings.MultipleChoiceDelimiter || ";");
            if (newValue != self.value)
                self.value = newValue
        }

        function onMouseOver(event) {
            if (event.target.parentElement.className == "dropDownListItemsContainer") {
                self.hover = event.target;

            }
            if (event.target.className == "ot-custom-DropDownAdditionalText") {
                self.hover = event.target.parentElement;

            }
        }
        function onKeyDown(event) {
            switch (event.keyCode) {
                case 13:/*Enter*/
                    if (hover)
                        Select(hover.objectData);
                    break;
                case 8:/*Backspace*/
                    if (readyForClean) {
                        var lastSelectedItemDOMElement = self.selectionContainer.querySelector(".otCustomSelectedOption:last-of-type");
                        lastSelectedItemDOMElement.parentElement.removeChild(lastSelectedItemDOMElement);
                        self.selectedItems.pop();
                        if (!self.selectedItems.length)
                            readyForClean = false;
                    }
                    break;
                case 38:/*ArrowUp*/
                    if (hover)
                        self.hover = (hover.previousElementSibling) ? hover.previousElementSibling : itemsContainer.lastElementChild;
                    else
                        self.hover = itemsContainer.lastElementChild;
                    hover.scrollIntoView();
                    break;
                case 40:/*ArrowDown*/
                    if (hover)
                        self.hover = (hover.nextElementSibling) ? hover.nextElementSibling : itemsContainer.firstElementChild;
                    else
                        self.hover = itemsContainer.firstElementChild;
                    hover.scrollIntoView();
                    break;
                case 220:
                case 226:/*BackSlash&IntlBackslash*/
                    event.preventDefault();
                    break;
                default:
                    break;
            }
        }
        function onInput(event) {
            if (event.target.value) {
                readyForClean = false;
                var searchString = event.target.value.replace(/([?$*(){}$\[\]])/gmi, '\\$1'); /* Ecsaping incorrect symbols */
                var regexp = new RegExp(searchString, "gi");
                self.visibleItems = items.filter(function (item) {
                    return Object.keys(item).map(function (e) {
                        return item[e]
                    }).join(";").match(regexp);
                });
            }
            else {
                self.visibleItems = items;
                if (params.isMultiple && self.selectedItems.length)
                    readyForClean = true;
            }
        }

        Object.defineProperty(this, "visibleItems", {
            set: function (value) {
                itemsState.textContent = (value && value.length || 0) + " items are shown";
                shownItems = value;
                self.searchFailed = value && !value.length;
                //itemsContainer.style.maxHeight = "0px" 
                while (itemsContainer.childElementCount) itemsContainer.removeChild(itemsContainer.lastChild);
                /* itemsContainer.innerHTML = "" */
                for (var i = 0; i < (value && value.length || 0); i++) {
                    var DOMlistItem = itemsContainer.createChild({ textContent: value[i][textFrom] });
                    DOMlistItem.objectData = value[i];
                    if (params.additionalTextFrom) {
                        var subset = [];
                        for (l = 0; l < params.additionalTextFrom.length; l++)
                            subset.push(value[i][params.additionalTextFrom[l]])
                        DOMlistItem.createChild({
                            textContent: subset.join(" > "),
                            className: "ot-custom-DropDownAdditionalText"
                        });
                    }
                }
                // itemsContainer.style.maxHeight = "300px"
            }
        });

        Object.defineProperty(this, "items", {
            set: function (value) {
                items = this.visibleItems = value;
            },
            get: function () {
                return items
            }
        });

        Object.defineProperty(this, "searchFailed", {
            set: function (state) {
                if (state) {
                    itemsContainer.hidden = true;
                    this.contentContainer.setAttribute("ot-custom-searchfailed", "");
                }
                else {
                    itemsContainer.hidden = false;
                    this.contentContainer.removeAttribute("ot-custom-searchfailed");
                }
            }
        });

        Object.defineProperty(this, "hover", {
            set: function (value) {
                hover = value;
                var prevHover = itemsContainer.querySelector(".otCustom-DropDownItemHover");
                if (prevHover)
                    prevHover.className = "";
                if (value)
                    value.className = "otCustom-DropDownItemHover";
            }
        });

        this.items = params.dataSource;
    }

    function DateTimePicker(params) {
        var self = this;
        var values = [];
        var isRange;
        var todayOA = new Date().setHours(0, 0, 0, 0)

        var localeData = {
            "ru": {
                dayNamesData: ["пн", "вт", "ср", "чт", "пт", "сб", "вс"],
                todayString: "Сейчас"
            },
            "en": {
                dayNamesData: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
                todayString: "Now"
            }
        };

        var days = localeData[otCustom.lang || "ru"].dayNamesData;

        DropDown.call(this, {
            onChange: params.onChange,
            container: params.container,
            onToggled: params.onToggled,
            onClick: onClick,
            validationRule: params.validationRule,
            focusout: onFocusOut,
            fieldContainer: params.fieldContainer,
        });

        this.contentContainer.addEventListener("keyup", function (event) {
            if (event.keyCode == 16 || event.keyCode == 17)
                self.isRange = false;
        });
        this.contentContainer.addEventListener("keydown", function (event) {
            if ((event.keyCode == 16 || event.keyCode == 17) && !isRange)
                self.isRange = true;
        });

        var MonthSelector = this.listContainer.createChild({ className: "ot-custom-DatePicker-MonthSelector" });
        var ShowPrevMonthButton = MonthSelector.createChild({ className: "ot-custom-DatePicker-SelectorButtons PrevMonth" });
        var monthName = MonthSelector.createChild({ className: "ot-custom-DatePicker-CurrentMonthHeader" });
        var ShowNextMonthButton = MonthSelector.createChild({ className: "ot-custom-DatePicker-SelectorButtons NextMonth" });

        var middleContainer = this.listContainer.createChild({ className: "ot-custom-date-middle-container" });
        var weeksContainer = middleContainer.createChild({ className: "ot-custom-date-weeks-container daynames" });
        for (var i = 0; i < days.length; i++) {
            weeksContainer.createChild({
                textContent: days[i],
                className: "ot-custom-date-daycell"
            });
        }
        var DateSelector = middleContainer.createChild({ className: "ot-custom-date-selector" });
        var BottomContainer = this.listContainer.createChild({ className: "ot-custom-DatePicker-BottomContainer" });
        var leftButtonWrapper = BottomContainer.createChild({ className: "leftButtonWrapper" });
        var todayButton = leftButtonWrapper.createChild({
            className: "ot-custom-DatePicker-TodayButton",
            textContent: localeData[otCustom.lang || "ru"].todayString
        });
        var rightButtonWrapper = BottomContainer.createChild({ className: "rightButtonWrapper" });
        var TimeWrapper = rightButtonWrapper.createChild({ className: "ot-custom-date-time-wrapper" });

        var timeInput = new TimeInput({
            container: TimeWrapper,
            onChange: function (e) {
                UpdateText()
            }
        });
        var monthSetter = new MonthSetter({
            onChange: function (e) {
                ShowMonth();
            }
        });

        function onClick(e) {
            if (e.target == ShowNextMonthButton)
                monthSetter.next;
            if (e.target == ShowPrevMonthButton)
                monthSetter.previous;
            if (e.target.className == "ot-custom-date-daycell validday")
                Select(new Date(parseInt(e.target.getAttribute("dd"))))
            if (e.target == todayButton || e.target == leftButtonWrapper)
                Select(new Date())
        }

        function onFocusOut(e) {
            UpdateValue();
        }

        this.Set = function (value) {
            if (value.match(/^\s*(3[01]|[12][0-9]|0?[1-9])\.(1[012]|0?[1-9])\.((?:19|20)\d{2})(\s[0-2][0-3]:[0-5][0-9])?$/g)) {
                var dateTimePairs = value.split(" ")
                var dateParts = dateTimePairs[0].split(".")
                if (dateTimePairs[1]) {
                    var timeParts = dateTimePairs[1].split(":")
                    var hour = timeParts[0]
                    var minute = timeParts[1]
                }
                else {
                    var hour = 0;
                    var minute = 0
                }

                var month = parseInt(dateParts[1]) - 1

                Select(new Date(dateParts[2], month, dateParts[0], hour, minute))
                UpdateValue()
            }
            if (value.match(/^(3[01]|[12][0-9]|0?[1-9])\.(1[012]|0?[1-9])\.((?:19|20)\d{2})\s\.\.\s(3[01]|[12][0-9]|0?[1-9])\.(1[012]|0?[1-9])\.((?:19|20)\d{2})$/g)) {
                var dateRangeParts = value.split(" .. ")
                var leftDateParts = dateRangeParts[0].split(".")
                var rightDateParts = dateRangeParts[1].split(".")

                var leftMonth = parseInt(leftDateParts[1] - 1)
                var rightMonth = parseInt(rightDateParts[1] - 1)

                isRange = true
                Select(new Date(leftDateParts[2], leftMonth, leftDateParts[0]))
                Select(new Date(rightDateParts[2], rightMonth, rightDateParts[0]))
                isRange = false
            }
        }

        function Select(selectedDay) {
            if (!timeInput.hour && !timeInput.minute) {
                timeInput.time = {
                    hour: selectedDay.getHours(),
                    minute: selectedDay.getMinutes()
                }
            }
            var OADay = selectedDay.setHours(0, 0, 0, 0);
            if (isRange) {
                switch (values.length) {
                    case 0:
                        values[0] = OADay;
                        break;
                    case 1:
                        if (OADay > values[0]) {
                            values[1] = OADay;
                        }
                        else {
                            values[1] = values[0];
                            values[0] = OADay;
                        }
                        break;
                    case 2:
                        if (OADay < values[0]) {
                            values[0] = OADay;
                        }
                        else {
                            values[1] = OADay;
                        }
                        break;
                }
            }
            else {
                values = [];
                values[0] = OADay;
            }
            SetSelection()
            UpdateText()
        }

        function ShowMonth() {
            monthName.textContent = monthSetter.toString();
            while (DateSelector.childElementCount > 0) DateSelector.removeChild(DateSelector.lastChild);
            var dayOfWeek = monthSetter.borders.firstWeekDay;
            for (var i = 1, dd = monthSetter.borders.left; i <= monthSetter.borders.lastDate; i++ , dd += 86400000, dayOfWeek++) {
                if (!weekContainer || dayOfWeek > 7) {
                    var weekContainer = DateSelector.createChild({ className: "ot-custom-date-weeks-container daycells" });
                    for (var j = 0; j < 7; j++) {
                        var dayCell = weekContainer.createChild({ className: "ot-custom-date-daycell" });
                        if (j > 4) dayCell.setAttribute("weekend", "");
                    }
                }
                if (dayOfWeek > 7) dayOfWeek = 1;

                weekContainer.childNodes[dayOfWeek - 1].innerText = i;
                weekContainer.childNodes[dayOfWeek - 1].className += " validday"
                weekContainer.childNodes[dayOfWeek - 1].setAttribute("dd", dd);
                if (dd == todayOA)
                    weekContainer.childNodes[dayOfWeek - 1].setAttribute("today", "");
            }
            if (values.length)
                SetSelection();
        }

        function SetSelection() {
            var previousSelected = DateSelector.querySelectorAll("[date-selected]");
            for (var s = 0; s < previousSelected.length; s++) {
                previousSelected[s].removeAttribute("date-selected");
            }
            for (var i = (values[0]); i <= (values[1] || values[0]); i += 86400000) {
                var dayCell = DateSelector.querySelector("[dd='" + i + "']");
                if (dayCell)
                    dayCell.setAttribute("date-selected", "");
            }
        }

        function UpdateValue() {
            if (values && values.length) {
                var leftDate = new Date(values[0]).toLocaleDateString("ru")
                if (values.length > 1)
                    var dateString = leftDate + " .. " + new Date(values[1]).toLocaleDateString("ru");
                else {
                    self.SelectedDate = new Date(values[0])
                    if (timeInput.hour || timeInput.minute) {
                        self.SelectedDate.setHours(timeInput.hour, timeInput.minute)
                        var dateString = leftDate + " " + timeInput.toString()
                    }

                    else
                        var dateString = leftDate;
                }
                self.value = dateString.replace(/\u200E/gmi, "");
            }
        }

        function UpdateText() {
            if (values && values.length) {
                var leftDate = new Date(values[0]).toLocaleDateString("ru")
                if (values.length > 1)
                    var dateString = leftDate + " .. " + new Date(values[1]).toLocaleDateString("ru");
                else
                    if (timeInput.hour || timeInput.minute)
                        var dateString = leftDate + " " + timeInput.toString()
                    else
                        var dateString = leftDate;
                self.selectionContainer.textContent = self.text = dateString;
            }
        }

        Object.defineProperty(this, "isRange", {
            set: function (value) {
                isRange = value;
                this.contentContainer.className = "otCustom-container dropDownContainer multiple-" + value;
                timeInput.disabled = value;
            }
        });

        ShowMonth();
    }
    function Memo(params) {
        var self = this;
        var toolsConfiguration = [
            "bold",
            "italic",
            "strikeThrough",
            "underline",
            "%s",
            "insertOrderedList",
            "insertUnorderedList",
            "%s",
            "insertImage",
            "%s",
            "justifyLeft",
            "justifyCenter",
            "justifyRight"
        ];

        Control.call(this, {
            onChange: params.onChange,
            container: params.container,
            validationRule: params.validationRule,
            fieldContainer: params.fieldContainer,
            creationConfig: {
                className: "otCustom-container otCustom-input-wrapper ot-custom-memo ot-custom-resizable",
                focusable: true,
                eventListeners: {
                    click: onClick,
                    focusout: onFocusOut
                }
            }
        });

        var tools = this.contentContainer.createChild({ className: "ot-custom-memo-tools" });
        var editor = this.contentContainer.createChild({
            className: "ot-custom-memo-editor",
            editable: true,
            eventListeners: {
                keyup: function () {
                    editor.style.height = 'auto'
                    checkEditorCommands();
                },
                paste: function (e) {
                    if (e.clipboardData && !navigator.userAgent.match(/Firefox/gi)) {
                        var blob = e.clipboardData.items[0].getAsFile();
                        if (blob) {
                            var base64URL = "";
                            var reader = new FileReader();
                            reader.onloadend = function () {
                                base64URL = reader.result;
                                editor.focus();
                                document.execCommand("insertImage", false, base64URL);
                            }
                            reader.readAsDataURL(blob);
                        }
                    }
                }
            }
        });
        for (var i = 0; i < toolsConfiguration.length; i++) {
            if (toolsConfiguration[i] == "%s")
                tools.createChild({ className: "ot-custom-memo-separator" });
            else
                tools.createChild({
                    tagName: "button",
                    className: "ot-custom-editor-toolbarBtn",
                    attributes: { "command": toolsConfiguration[i] }
                });
        }
        var fileControl = tools.createChild({
            tagName: "input",
            type: "file",
            hidden: true,
            attributes: {
                accept: "image/*"
            },
            eventListeners: {
                "change": function (event) {
                    if (this.files && this.files.length && this.files[0].type.match(/image\/.*/gmi)) {
                        var file = this.files[0];

                        var base64URL = "";
                        var reader = new FileReader();
                        reader.onloadend = function () {
                            base64URL = reader.result;
                            editor.focus();
                            document.execCommand("insertImage", false, base64URL);
                            /*                 editor.createChild({
                                                tagName:"img",
                                                attributes:{"src":base64URL}
                                            }); */
                        }
                        reader.readAsDataURL(file);
                        this.value = "";
                    }
                }
            }
        });

        this.contentContainer.createChild({
            className: "otc-resizer-space"
        });

        this.contentContainer.createChild({
            className: "ot-custom-resizer",
            eventListeners: {
                mousedown: function (e) {
                    var startY = e.clientY;
                    var startHeight = editor.clientHeight;
                    window.addEventListener('mousemove', ResizeByHeight, false);
                    window.addEventListener('mouseup', stopResize, false);
                    function ResizeByHeight(e) {
                        editor.style.height = (startHeight + e.clientY - startY) + 'px';
                    }
                    function stopResize(e) {
                        window.removeEventListener('mousemove', ResizeByHeight, false);
                        window.removeEventListener('mouseup', stopResize, false);
                    }
                }
            }
        });

        function onClick(event) {
            if (event.target.className == "ot-custom-editor-toolbarBtn") {
                if (event.target.getAttribute("command") == "insertImage")
                    fileControl.click();
                else
                    document.execCommand(event.target.getAttribute("command"));
                event.preventDefault();
            }
            checkEditorCommands();
        }

        function onFocusOut(e) {
            if (!this.contains(e.relatedTarget) && editor.innerHTML != self.value)
                Select()
        }

        function checkEditorCommands() {
            for (var i = 0; i < toolsConfiguration.length; i++) {
                if (toolsConfiguration[i] != "%s") {
                    var state = document.queryCommandState(toolsConfiguration[i]);
                    var btn = tools.querySelector("[command='" + toolsConfiguration[i] + "']");
                    if (state)
                        btn.setAttribute("activated", "");
                    else
                        btn.removeAttribute("activated", "");
                }
            }
        }

        this.Set = function (value) {
            if (value)
                editor.innerHTML = value;
            Select()
        }

        function Select() {
            if (editor.textContent == "" && !editor.querySelector("img")) {
                self.text = ""
                self.value = "";
            }
            else {
                self.text = editor.textContent
                self.value = editor.innerHTML;
            }

        }
    }
    function Text(params) {
        var self = this;
        Control.call(this, {
            fieldContainer: params.fieldContainer,
            onChange: params.onChange,
            container: params.container,
            validationRule: params.validationRule,
            creationConfig: {
                className: "otCustom-container otCustom-input-wrapper ot-custom-text",
                tagName: "input",
                eventListeners: {
                    "change": function (event) {
                        self.value = this.value;
                    }
                }
            }
        });

        this.Set = function (value) {
            self.value = self.contentContainer.value = value
        }
    }
    function Box(params) {
        var self = this;
        var items = [];
        var textFrom = params.textFrom || otCustom.Settings.ChoiceDefaultTextFrom || "Title";
        var valueFrom = params.valueFrom || otCustom.Settings.ChoiceDefaultValueFrom || "UID";
        var choiceType = (params.isMultiple) ? "checkbox" : "radio";
        var selectedItems = [];

        Control.call(this, {
            onChange: params.onChange,
            container: params.container,
            validationRule: params.validationRule,
            creationConfig: {
                className: "otCustom-container ot-custom-choice-wrapper " + choiceType + "-ot-custom-wrapper",
                eventListeners: {
                    click: function (event) {
                        if (event.target.className == "ot-custom-choice-item")
                            event.target.firstElementChild.click();
                        if (event.target.type == choiceType)
                            Select();
                    }
                }
            }
        });

        this.Set = function (value) {
            var valuesForSet = value.split(";")
            for (i = 0; i < valuesForSet.length; i++) {
                var valueObject = items.filter(function (e) {
                    return e[valueFrom] == valuesForSet[i] || e[textFrom] == valuesForSet[i]
                });

                var choiceItem = this.contentContainer.querySelector("[value='" + valueObject[0][valueFrom] + "']")

                if (choiceItem) {
                    choiceItem.checked = true;
                    Select()
                }
            }
        }

        function Select() {
            selectedItems = [];
            var checkedInputs = params.container.querySelectorAll("input:checked");
            for (var i = 0; i < checkedInputs.length; i++)
                selectedItems.push(checkedInputs[i].objectData);
            self.text = selectedItems.map(function (item) {
                return item[textFrom];
            }).join(";");
            self.value = selectedItems.map(function (item) {
                return item[valueFrom];
            }).join(";");
        }

        Object.defineProperty(this, "items", {
            set: function (dataSource) {
                items = dataSource
                while (self.contentContainer.childElementCount > 0) self.contentContainer.removeChild(self.contentContainer.lastChild);
                for (var i = 0; i < (dataSource && dataSource.length || 0); i++) {
                    var choiceItemWrapper = self.contentContainer.createChild({ className: "ot-custom-choice-item" });
                    var choiceItem = choiceItemWrapper.createChild({
                        tagName: "input",
                        type: choiceType,
                        value: dataSource[i][valueFrom],
                        id: "C_" + params.container.id + "_" + i,
                        name: "C_" + params.container.id,
                        textNode: dataSource[i][textFrom]
                    });
                    choiceItem.objectData = dataSource[i];
                }
            }
        });

        this.items = params.dataSource;
    }
    function Choice(params) {
        if (params.ChoiceView == "DropDown")
            ComboBox.call(this, params);
        else
            Box.call(this, params);
    }
    function Grid(params) {
        var self = this;
        var dataSet = [];

        var rmButton;
        var selectedDataSets = [];
        Control.call(this, {
            onChange: params.onChange,
            container: params.container,
            validationRule: params.validationRule,
            creationConfig: {
                className: "otCustom-container otCustom-input-wrapper ot-custom-grid-container"
            }
        });
        var dataTable = self.contentContainer.createChild({
            tagName: "table",
            className: "ot-custom-grid-table"
        });
        var dataTableBody = dataTable.createChild({
            tagName: "tbody"
        });

        this.Set = function (value) {
            self.value = value;
            var parsedDataSetValue = value.split(otCustom.Settings.GridTextValueDelimiter)[0]
            var parsedDataset = JSON.parse(parsedDataSetValue)
            var row = dataTableBody.childNodes[1];
            for (var k in parsedDataset[0]) {
                var cellValue = parsedDataset[0][k]
                var element = row.querySelector("[bind-data-for=" + k + "]")
                if (element.firstElementChild.tagName == "INPUT")
                    element.firstElementChild.value = cellValue;
                else
                    element.dateTimeInput.Set(cellValue)
            }
            dataSet[0] = row.gridData = parsedDataset[0];
            for (var i = 1; i < parsedDataset.length; i++) {
                var row = addRow();
                for (var k in parsedDataset[i]) {
                    var cellValue = parsedDataset[i][k]
                    var element = row.querySelector("[bind-data-for=" + k + "]")
                    if (element.firstElementChild.tagName == "INPUT")
                        element.firstElementChild.value = cellValue;
                    else
                        element.dateTimeInput.Set(cellValue)
                }
                dataSet[i] = row.gridData = parsedDataset[i];
            }
            self.value = JSON.stringify(dataSet) + otCustom.Settings.GridTextValueDelimiter + ConvertDataSetToString();
        }
        Object.defineProperty(this, "selectedDataSets", {
            /* Переименовать в selectedRows */
            set: function (value) {
                if (value) {
                    value.setAttribute("ot-custom-grid-row-selected", "");
                    self.contentContainer.setAttribute("ot-custom-grid-has-selected-rows", "")
                    rmButton.hidden = false
                    selectedDataSets[0] = value;
                }
                else {
                    var selectedRow = self.contentContainer.querySelector("[ot-custom-grid-row-selected]")
                    if (selectedRow)
                        selectedRow.removeAttribute("ot-custom-grid-row-selected");
                    self.contentContainer.removeAttribute("ot-custom-grid-has-selected-rows")
                    rmButton.hidden = true;
                    selectedDataSets = [];
                }
            },
            get: function () {
                return selectedDataSets;
            }
        });

        if (params.fieldNames) {
            var buttonsContainer = self.contentContainer.createChild({
                className: "ot-custom-grid-buttons",
            });
            var addButton = buttonsContainer.createChild({
                className: "ot-custom-grid-buttons-add",
                eventListeners: {
                    mousedown: addRow
                }
            });
            rmButton = buttonsContainer.createChild({
                className: "ot-custom-grid-buttons-rm",
                hidden: true,
                eventListeners: {
                    mousedown: rmRow
                }
            });
            var dataTableHeaderRow = dataTableBody.createChild({
                tagName: "tr"
            });
            for (var i = 0; i < params.fieldNames.length; i++) {
                dataTableHeaderRow.createChild({
                    tagName: "th",
                    className: "ot-custom-grid-header-row",
                    textContent: params.fieldNames[i].Title
                });
            }
            addRow();
            function addRow() {
                var row = dataTableBody.createChild({
                    tagName: "tr"
                });
                var gridData = {};
                row.gridData = gridData;
                dataSet.push(gridData);
                for (var i = 0; i < params.fieldNames.length; i++) {
                    var dataForString = params.fieldNames[i].Code
                    var inputCell = row.createChild({
                        tagName: "td",
                        className: "ot-custom-grid-data-cell",
                        attributes: { "bind-data-for": dataForString }
                    });
                    if (params.fieldNames[i].Type == "Text")
                        inputCell.createChild({
                            tagName: "input",
                            className: "ot-custom-grid-data-cell-input",
                            eventListeners: {
                                change: onChange,
                                input: onChange,
                                focus: function (event) {
                                    self.selectedDataSets = this.parentElement.parentElement;
                                },
                                blur: function (event) {
                                    self.selectedDataSets = null;
                                }
                            }
                        });
                    else
                        var dateInput = new otCustom.Controls.Date({
                            container: inputCell,
                            onChange: onDatePickerChange
                        });
                    inputCell.dateTimeInput = dateInput;
                    gridData[dataForString] = "";

                }
                function onChange(event) {
                    var targetGridData = this.parentElement.parentElement.gridData;
                    targetGridData[this.parentElement.getAttribute("bind-data-for")] = this.value;
                    self.value = (dataSetIsEmpty(dataSet)) ? null : JSON.stringify(dataSet) + otCustom.Settings.GridTextValueDelimiter + ConvertDataSetToString();
                }
                function onDatePickerChange(state) {
                    var cellContainer = state.contentContainer.parentElement.parentElement
                    var targetGridData = cellContainer.parentElement.gridData;
                    targetGridData[cellContainer.getAttribute("bind-data-for")] = state.value;
                    self.value = (dataSetIsEmpty(dataSet)) ? null : JSON.stringify(dataSet) + otCustom.Settings.GridTextValueDelimiter + ConvertDataSetToString();
                }
                return row;
            }
            function rmRow() {
                for (var i = 0; i < self.selectedDataSets.length; i++) {
                    var selectedGridData = self.selectedDataSets[i].gridData;
                    var idx = dataSet.indexOf(selectedGridData)
                    dataSet.splice(idx, 1);
                    dataTableBody.removeChild(self.selectedDataSets[i]);
                    self.value = (dataSetIsEmpty(dataSet)) ? null : JSON.stringify(dataSet) + otCustom.Settings.GridTextValueDelimiter + ConvertDataSetToString();
                }
            }
            function dataSetIsEmpty(dataSet) {
                var l = dataSet.length;
                for (var i = 0; i < l; i++) {
                    var data = dataSet[i];
                    for (var k in data) {
                        if (data[k])
                            return false;
                    }
                }
                return true;
            }
            function ConvertDataSetToString() {
                var headerRow = ""
                var HTMLContent = ""
                cellStyle = "border: 1px solid lightgrey;"
                for (var i = 0; i < params.fieldNames.length; i++)
                    headerRow += "<th style='" + cellStyle + "' >" + params.fieldNames[i].Title + "</th>"
                headerRow = "<tr>" + headerRow + "</tr>"
                for (var i = 0; i < dataSet.length; i++) {
                    var dataRowHTML = ""
                    var values = Object.keys(dataSet[i]);
                    for (var j = 0; j < values.length; j++) {
                        var value = dataSet[i][values[j]]
                        if (value.match("DateTime::")) {
                            value = new Date(parseInt(value.split("::")[1])).toLocaleDateString("ru")
                        }
                        dataRowHTML += "<td style='" + cellStyle + "' >" + value + "</td>"
                    }
                    dataRowHTML = "<tr>" + dataRowHTML + "</tr>"
                    HTMLContent += dataRowHTML
                }
                return "<table>" + headerRow + HTMLContent + "</table>";
            }
        }
    }
    Controls.Date = DateTimePicker;
    Controls.Memo = Memo;
    Controls.Text = Text;
    Controls.Choice = Choice;
    Controls.Grid = Grid;
})(otCustom.Controls);

/* SSP-integration */

var otcSf;

otCustom.onChange = function (state) {
    otCustom.Form.OmnitrackerControls.StorageControl.value = otCustom.Form.relationsData;

    var sspUIDContainer = document.querySelector("#otc-selected-ssp-service-info")
    if (sspUIDContainer) {
        var selectedSSPService = {
            UID: sspUIDContainer.dataset.uid,
            Values: otCustom.Form.relationsData
        };
        document.cookie = "selectedSSPService=" + JSON.stringify(selectedSSPService)
    }

    ValueChanged(otCustom.Form.OmnitrackerControls.StorageControl, true)
    var visibilitySlaves = state.slaveFields.visibility; /* Видимость дочерних полей */
    for (var i = 0; i < visibilitySlaves.length; i++)
        CheckVisibility(state, visibilitySlaves[i])
    var filterSlaves = state.slaveFields.filter; /* Фильтр итемов дочерних полей (только для поля c типом Choice)*/
    for (var i = 0; i < filterSlaves.length; i++) {
        filterSlaves[i].items = FilterChoiceItems(state, filterSlaves[i])
        /* for (var f = 0 ; f < filterSlaves[i].items.length; f++){
            console.log(filterSlaves[i].items[f])
        }*/
        if (filterSlaves[i].items.indexOf(filterSlaves[i].selectedItems[0]) == -1) {
            filterSlaves[i].Set(null)
        }

    }

    CheckVisibilityRules()

    if (state.onChangeTrigger) {
        eval(state.onChangeTrigger)
    }

}

otCustom.onError = function (msg) {
    alert(msg);
    otCustom.Form.Redefine();
    cancel();
}

otCustom.onToggle = function (listVisibleSize, ctx) {
    if (ctx && ctx.fieldContainer) {
        var backgroundContainer = ctx.fieldContainer.parentElement;
        if (backgroundContainer.className == "BackgroundContainer") {

            if (listVisibleSize)
                backgroundContainer.parentElement.style["minHeight"] = 70 + listVisibleSize + "px";
            else
                backgroundContainer.parentElement.style["minHeight"] = "100%";
        }
    }
}

Object.defineProperty(otCustom, "lang", {
    get: function () {
        return OT.MultilingualStrings.language;
    }
});

function FilterChoiceItems(state, SSPField) {
    var filterByProperty = SSPField.filterByProperty;
    if (state.selectedItems) {
        var slaveVisibleItems = []
        for (var j = 0; j < state.selectedItems.length; j++) {
            var filteredDataSource = SSPField.selections.filter(function (item) {
                return item[filterByProperty] == state.selectedItems[j].Title || item[filterByProperty] == state.selectedItems[j].UID;
            })
            slaveVisibleItems = slaveVisibleItems.concat(filteredDataSource);
        }
        return slaveVisibleItems
    }
    else {
        return SSPField.selections.filter(function (item) {
            return item[filterByProperty] == state.value || item[filterByProperty] == state.text;
        });
    }
}

function CheckVisibility(MasterSSPField, SSPField) {
    var visibleValues = SSPField.visibleValues;
    var isEmpty = visibleValues[0] == "%Null" && MasterSSPField.value.length == 0
    var isAnyNonEmpty = visibleValues[0] == "%Any" && MasterSSPField.value.length != 0
    var isVisible = (isEmpty || isAnyNonEmpty || MasterSSPField.text && checkAtLeastOneContains(visibleValues, MasterSSPField.text.split(";")));
    SSPField.SetVisibility(isVisible)
}

function CheckVisibilityRules() {
    for (var k in otCustom.Form.VisibilityRules) {
        var SSPField = otCustom.Form.Fields[k]
        var visibilityRule = otCustom.Form.VisibilityRules[k]
        var AffectedSSPFieldMasks = visibilityRule.match(/\{@\d+\}/gmi)
        var VisibilityRuleEvalQuery = visibilityRule
        for (var i = 0; i < AffectedSSPFieldMasks.length; i++) {
            var AffectedSSPFieldID = otCustom.Settings.SSPFieldNamePrefix + AffectedSSPFieldMasks[i].replace(/[}{@}]/gmi, "")
            var AffectedSSPField = otCustom.Form.Fields[AffectedSSPFieldID]
            var fieldValue = AffectedSSPField.text || AffectedSSPField.value
            VisibilityRuleEvalQuery = VisibilityRuleEvalQuery.replace(AffectedSSPFieldMasks[i], "'" + fieldValue + "'")
        }
        SSPField.isVisible = eval(VisibilityRuleEvalQuery)
    }
}

function checkAtLeastOneContains(arrayForCheck, arrayTarget) {
    for (var i = 0; i < arrayForCheck.length; i++)
        if (arrayTarget.indexOf(arrayForCheck[i]) != -1)
            return true;
    return false;
}
function initSearchServicesControl() {
    var sfContent = document.querySelector("#otc-sf-content");
    if (sfContent) {
        var searchFormData = JSON.parse(sfContent.textContent);
        if (typeof otCustom != "undefined") {

            sfParams = {
                container: document.querySelector("#otc-search-form-container"),
                dataSource: searchFormData,
                placeholder: otCustom.Settings.sfPlaceholder,
                additionalTextFrom: ["Container", "Class"],
                ChoiceView: "DropDown",
                type:"Choice",
                onChange: function (item) {
                    OpenServiceForm(item.value);
                }
            }
            new otCustom.Field(sfParams);
        }
    }
}
function ShowServices(viewId, folderAlias) {
    /* перенести в xslt */
    invoke_combo_script("Show services", "", new Array(String(viewId), folderAlias, ''));
}
function CheckValidate(bundleArg, fieldArg) {
    if (bundleArg.Type)
        return bundleArg
    return fieldArg
}
function OpenServiceForm(spointServiceUid) {
    /* 2 xslt */
    invoke_combo_script('SpointCombo', '', new Array(spointServiceUid, ''));
}
function initFieldState(params) {
    params.fieldNames = (params.fieldNames) ? JSON.parse(params.fieldNames) : null
    params.fieldContainer = document.querySelector(".OTCustomFieldContainer[otCustomForField='" + params.fieldID + "']");
    params.container = document.querySelector("#" + params.fieldID);

    if (params.validationRule.Type) {
        var errorMsgTemplate = params.validationRule.ErrorMessage;
        var masks = errorMsgTemplate.match(/\{%\w*}/gmi)
        for (var i = 0; i < masks.length; i++) {
            var mask = masks[i].replace(/[}{%]/gmi, "")
            errorMsgTemplate = errorMsgTemplate.replace(masks[i], params[mask])
        }
        params.validationRule.ErrorMessage = errorMsgTemplate;
        if (params.validationRule.Type == "Exec") {
            params.validationRule.Query = params.validationRule.Query.replace("{%field}", "otCustom.Form.Fields[\"" + params.fieldID + "\"]").replace("&gt;", ">").replace("&lt;", "<").replace(/&amp;/gmi, "&");
        }
    }

    if (params.onChangeTrigger) {
        params.onChangeTrigger = params.onChangeTrigger.replace("{%field}", "otCustom.Form.Fields[\"" + params.fieldID + "\"]").replace("&gt;", ">").replace("&lt;", "<").replace(/&amp;/gmi, "&");
        var fieldMasks = params.onChangeTrigger.match(/\{@\d+\}/gmi);
        for (var i = 0; i < fieldMasks.length; i++) {
            var result = "otCustom.Form.Fields[\'SPOINT_FIELD-" + fieldMasks[i].replace(/[}@{}]/gmi, "") + "\']"
            params.onChangeTrigger = params.onChangeTrigger.replace(fieldMasks[i], result)
        }
    }

    if (params.visibilityRule)
        otCustom.Form.VisibilityRules[params.fieldID] = params.visibilityRule.replace(/&amp;/gmi, "&").replace(/&gt;/gmi, ">").replace(/&lt;/gmi, "<")

    var field = otCustom.Form.Fields[params.fieldID];
    if (field)
        var storage = field.value || otCustom.Form.Storage[params.fieldID]

    var field = otCustom.Form.Fields[params.fieldID] = new otCustom.Field(params);

    if (storage)
        field.Set(storage)
}
function onOk(event) {
    if (otCustom.Form.description) {
        if (otCustom.Form.webRequest && Object.keys(otCustom.Form.webRequest).length) {
            var finalWebRequestBody = otCustom.Form.webRequest.body
            var webRequestArgs = otCustom.Form.webRequest.body.split("&")

            for (var i = 0; i < webRequestArgs.length; i++) {
                var valueMask = webRequestArgs[i].split("=")[1]
                if (valueMask.match(/SPOINT_FIELD/gmi)) {
                    var SSPField = otCustom.Form.Fields[valueMask.replace(/[}{}]/gmi, "")]
                    var value = SSPField.text || SSPField.value
                }
                if (valueMask.match(/@/gmi)) {
                    var valueKey = valueMask.replace(/@/gmi, "")
                    var SSPField = otCustom.Form.Fields["SPOINT_FIELD-" + valueKey.replace(/[}{}]/gmi, "")]
                    var value = SSPField.text || SSPField.value
                    if (SSPField.type != "Date") {
                        var value = encodeURIComponent(value)
                    }
                    else {
                        var value = value.replace(/\u200E/gmi, "")
                    }
                }
                if (valueMask.match(/%/gmi)) {
                    var valueKey = valueMask.replace(/%/gmi, "")
                    var value = otCustom.Form.InitiatorInfo[valueKey.replace(/[}{}]/gmi, "")]
                }
                var regexp = new RegExp(valueMask, "gmi")
                finalWebRequestBody = finalWebRequestBody.replace(regexp, value)

            }
            var xhr = new XMLHttpRequest();
            var body = finalWebRequestBody
            xhr.open("POST", otCustom.Form.webRequest.target, true);
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            xhr.send(body);
        }

        otCustom.Form.Redefine();
        document.cookie = "selectedSSPService={}"
        this.disabled = 'disabled';
        save_and_close();
        return HideToolbarMenu(event);
    }
}
function onCancel(event) {
    otCustom.Form.Redefine();
    document.cookie = "selectedSSPService={}"
    this.disabled = 'disabled';

    cancel();
    return HideToolbarMenu(event);
}

function ApplyStyleToNewTicketForm() {
    $("[name='wgc_div']").off()
    /* $("#ObjectFormToolbar_tblObjBtnBar")[0].oncontextmenu = function () { } */
    /* WebGridControl.prototype.OnKeyDown = function () { }; */
    var btnOk = document.querySelector("[id*='btnOK']");
    var btnCancel = document.querySelector("#ObjectFormToolbar_btnCancel");
    btnOk.onclick = onOk;
    btnCancel.onclick = onCancel;
    var ChoiceDataContainer = document.querySelector("[title=OT_CUSTOM_BUNDLES] > label")
    if (ChoiceDataContainer && ChoiceDataContainer.textContent)
        otCustom.Form.ChoiceData = JSON.parse(ChoiceDataContainer.textContent)
    var webRequestContainer = document.querySelector("#otc-web-request-text")
    var webRequestTargetContainer = document.querySelector("#otc-web-request-target")
    var initiatorInfoContainer = document.querySelector("#otc-initator-info")

    if (webRequestContainer && webRequestContainer.textContent && webRequestTargetContainer && webRequestTargetContainer.textContent) {
        otCustom.Form.webRequest = {
            body: webRequestContainer.textContent,
            target: webRequestTargetContainer.textContent
        }
    }
    if (initiatorInfoContainer && initiatorInfoContainer.textContent)
        otCustom.Form.InitiatorInfo = JSON.parse(initiatorInfoContainer.textContent).initiatorInfo
    var sspUIDContainer = document.querySelector("#otc-selected-ssp-service-info")
    if (sspUIDContainer) {
        var selectedSSPService = {
            UID: sspUIDContainer.dataset.uid,
            Values: otCustom.Form.relationsData
        };
        document.cookie = "selectedSSPService=" + JSON.stringify(selectedSSPService)
    }
    var relationIDsContainer = document.querySelector("#otc-relations-info")
    if (relationIDsContainer)
        otCustom.Form.RelationIDs = relationIDsContainer.dataset.uid
    CheckVisibilityRules()
}
function GetStorageControl() {
    otCustom.Form.OmnitrackerControls.StorageControl = document.querySelector("[title=Storage] + div textarea")
    var primaryStorageData = otCustom.lastCrashedTicket && otCustom.lastCrashedTicket.Values || otCustom.Form.OmnitrackerControls.StorageControl.value
    if (primaryStorageData) {
        var out = {};
        var relationRows = primaryStorageData.split(otCustom.Settings.RelationsRowDelimiter)
        for (var i = 0; i < relationRows.length; i++) {
            var keyValuePairs = relationRows[i].split(otCustom.Settings.RelationsKeyValueDelimiter)
            out[keyValuePairs[0]] = keyValuePairs[1]
        }
        /* primaryStorage = out; */
        otCustom.Form.Storage = out
    }
}

function OnSSPEnter() {
    var lastCrashedTicketCookie = getCookie("selectedSSPService")

    if (lastCrashedTicketCookie) {
        var lastCrashedTicket = JSON.parse(lastCrashedTicketCookie)
        if (Object.keys(lastCrashedTicket).length) {
            otCustom.lastCrashedTicket = lastCrashedTicket
            var lastCrashedConfirmation = confirm("Создание заявки было прервано. Продолжить?")
            if (lastCrashedConfirmation) {
                OpenServiceForm(lastCrashedTicket.UID)
            }
            else {
                document.cookie = "selectedSSPService={}"
            }
        }

    }
}

function getCookie(name) {
    var matches = document.cookie.match(new RegExp(
        "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
    ));
    return matches ? decodeURIComponent(matches[1]) : undefined;
}

function SetRelation(ID, Value) {
    invoke_combo_script('SetRelationValue', '', new Array(ID, Value, ''));
}

function DateDiffInDaysFromCurrent(DateArg) {
    return (DateArg - new Date()) / 86400000
}

/* SSP.js */

var navHistory = [];

var togglerItemsContainer, toggler, langContainer;

function moveMaximizeFilterButton(rootNode) {
    var sfPanels = rootNode.querySelectorAll(".SFPanel");
    for (var i = 0; i < sfPanels.length; i++) {
        var item = sfPanels[i];
        var inputTextElement = item.querySelector("input[type='text']");
        var label = item.querySelector(".SFLabelCell .SFLabel");
        if (label && inputTextElement) {
            inputTextElement.setAttribute("placeholder", label.title);
        }
    }
}


window.addEventListener("resize", onWindowResize)

function onWindowResize(event) {

    togglerItemsContainer = document.querySelector("#ot-custom-toggler-items")
    var container = document.querySelector("#otc-nav-bar-content")
    toggler = document.querySelector("#ot-custom-extender-wrapper")
    toggler.addEventListener("focusout", function (e) {
        if (!this.contains(e.relatedTarget)) {
            togglerItemsContainer.hidden = true
        }
    })
    toggler.addEventListener("focusin", function (e) {
        togglerItemsContainer.hidden = false
    })
    var togglerStyle = toggler.currentStyle || window.getComputedStyle(toggler);
    var togglerMargin = parseInt(togglerStyle.marginLeft) + parseInt(togglerStyle.marginRight)


    while (togglerItemsContainer.firstElementChild)
        togglerItemsContainer.removeChild(togglerItemsContainer.firstElementChild)
    var childs = container.querySelectorAll("a")
    var rect = container.getClientRects();
    try {
        var r1 = rect[0];
        var containerRight = r1.right;
    }
    catch (e) { }

    for (var i = 0; i < childs.length; i++) {
        var child = childs[i];
        var childRect = child.getClientRects();
        try {
            var childRight = childRect[0].right
        }
        catch (e) { }
        if (childRight + toggler.clientWidth + togglerMargin >= containerRight) {
            if (typeof firstHiddenChild == "undefined")
                var firstHiddenChild = child;
            child.setAttribute("ot-custom-hidden-ref", "")
            var clonedChild = child.cloneNode(true);
            clonedChild.className = "ot-custom-hidden-href-list-item";
            clonedChild.removeAttribute("ot-custom-hidden-ref")
            togglerItemsContainer.appendChild(clonedChild);
        }
        else
            child.removeAttribute("ot-custom-hidden-ref")
    }
    if (togglerItemsContainer.firstElementChild) {
        toggler.removeAttribute("ot-custom-hidden-ref", "")
        toggler.parentElement.insertBefore(toggler, firstHiddenChild)
    }
    else {
        toggler.parentElement.appendChild(toggler)
        toggler.setAttribute("ot-custom-hidden-ref", "")
    }
}


function RenderLinks() {
    function onResize(event) {
        while (togglerItemsContainer.firstElementChild)
            togglerItemsContainer.removeChild(togglerItemsContainer.firstElementChild)
        var childs = container.querySelectorAll("a")
        var rect = container.getClientRects();
        try {
            var r1 = rect[0];
            var containerRight = r1.right;
        }
        catch (e) { }
        for (var i = 0; i < childs.length; i++) {
            var child = childs[i];
            var childRect = child.getClientRects();
            try {
                var childRight = childRect[0].right
            }
            catch (e) { }
            if (childRight + toggler.clientWidth + togglerMargin >= containerRight) {
                if (typeof firstHiddenChild == "undefined")
                    var firstHiddenChild = child;
                child.setAttribute("ot-custom-hidden-ref", "")
                var clonedChild = child.cloneNode(true);
                clonedChild.className = "ot-custom-hidden-href-list-item";
                clonedChild.removeAttribute("ot-custom-hidden-ref")
                /* hiddenHrefs.push(child) */
                togglerItemsContainer.appendChild(clonedChild);
            }
            else
                child.removeAttribute("ot-custom-hidden-ref")
        }
        if (togglerItemsContainer.firstElementChild) {
            toggler.hidden = false;
            toggler.parentElement.insertBefore(toggler, firstHiddenChild)
        }
        else {
            toggler.parentElement.appendChild(toggler)
            toggler.hidden = true;
        }
    }


    var headerContainer = document.querySelector("#pnlMainHeader");
    if (headerContainer && !document.querySelector("#ot-custom-lc")) {
        var logoContainer = headerContainer.createChild({
            id: "ot-custom-lc",
            insertBefore: headerContainer.lastElementChild,
            childs: [{
                tagName: "a",
                id: "ot-custom-lc-href",
                attributes: {
                    href: "http://gdc16/"
                }
            }]
        });
        var container = headerContainer.createChild({
            id: "navcontent",
            insertBefore: headerContainer.lastElementChild
        });
        if (!document.querySelector("#shortcutBar > li:last-child > ul"))
            document.querySelector("#shortcutBar > li:last-child").firstElementChild.click();
        var navBar = document.querySelectorAll("#shortcutBar > li:last-child > ul[role=group] span[onclick]");
        for (var i = 0; i < navBar.length; i++) {
            container.createChild({
                tagName: "a",
                textContent: navBar[i].textContent,
                className: "ot-custom-href",
                attributes: {
                    onclick: "__doPostBack('pbeh', 'shortcut_" + navBar[i].getAttribute("data-ot-id") + "')"
                }
            });
        }

        var toggler = container.createChild({
            className: "ot-custom-href",
            id: "ot-custom-extender-wrapper",
            focusable: true,
            eventListeners: {
                blur: function (e) {
                    if (!this.locked)
                        togglerItemsContainer.hidden = true
                },
                mousedown: function (e) {
                    this.locked = true;
                    setTimeout(function () {
                        toggler.locked = false;
                    }, 10);
                }
            }
        });
        var togglerButton = toggler.createChild({
            id: "ot-custom-toggler-btn",
            textContent: "...",
            eventListeners: {
                click: function (e) {
                    togglerItemsContainer.hidden = !togglerItemsContainer.hidden
                }
            }
        });
        var togglerItemsContainer = toggler.createChild({
            id: "ot-custom-toggler-items",
            hidden: true
        });

        var togglerStyle = toggler.currentStyle || window.getComputedStyle(toggler);
        var togglerMargin = parseInt(togglerStyle.marginLeft) + parseInt(togglerStyle.marginRight)
        window.addEventListener("resize", onResize);
        onResize()
    }
}
/* function ApplyLanguageToggler() {
    var currentLang = OT.MultilingualStrings.language;
    if (!$("#languageToggleContainer")[0]) {
        var languageToggleContainer = $(".main-header-bar")[0].createChild({ id: "languageToggleContainer", insertBefore: $(".header-cell-settings")[0] });
        if (currentLang == "en") {
            var togglerButton = languageToggleContainer.createChild({
                tagName: "a",
                className: "country-icon country-icon-en",
                attributes: {
                    href: "/ssp/?guestlogin=1&lang=ru",
                    targetLang : "ru"
                }
            });
        }
        else {
            var togglerButton = languageToggleContainer.createChild({
                tagName: "a",
                className: "country-icon country-icon-ru",
                attributes: {
                    href: "/ssp/?guestlogin=1&lang=en",
                    targetLang : "en"
                }
            });
        }

        togglerButton.addEventListener("click", function (e) {
            document.cookie = "otc-ssp-login-lang=" + this.getAttribute("targetLang")
        });
    }
} */

function SwitchLang() {
    var currentLang = OT.getLoginLanguage();
    var cookieData = document.cookie.split(";")
    for (var i = 0; i < cookieData.length; i++) {
        var keyValuePair = cookieData[i].split("=")
        if (keyValuePair[0].trim() == "otc-ssp-login-lang") {
            if (currentLang != keyValuePair[1]) {
                /* alert(currentLang  + ";" + keyValuePair[1]) */
                /* document.cookie = "otc-ssp-login-lang=" + keyValuePair[1] */
                window.location.href = "http://sd/ssp/Login.aspx?guestlogin=1&lang=" + keyValuePair[1]
            }
        }
    }
}

$(document).ajaxSuccess(function () {
    if (OT.IsMainPage) {
        onWindowResize()
        /* OT && OT.MultilingualStrings && OT.MultilingualStrings.language && OT.getLoginLanguage &&  SwitchLang() */
        moveMaximizeFilterButton(document);
        /* ApplyLanguageToggler(); */

        var previousHistoryEntry = navHistory && navHistory[navHistory.length - 1];
        if (!previousHistoryEntry || previousHistoryEntry.folder != OT.OTData.FolderId || previousHistoryEntry.view != OT.OTData.ViewId) {
            navHistory.push({
                folder: OT.OTData.FolderId,
                view: OT.OTData.ViewId
            });
        }
    }
    /* RenderLinks(); */
    $("#otwgc").off();
});

/* $(document).ajaxStart(function(e){
    SwitchLang()
}) */

history.pushState(null, null, window.location.href);
window.addEventListener("popstate", function (e) {
    history.pushState(null, null, window.location.href);
    if (OT.IsMainPage) {
        navHistory.pop()
        var lastHistoryEntry = navHistory[navHistory.length - 1]

        if (lastHistoryEntry)
            ShowServices(lastHistoryEntry.view, lastHistoryEntry.folder)
        else {
            if (OT.OTData.ViewId == "16805")
                window.location.href = "http://gdc16/"
            else
                ShowServices("Containers-view", "Containers")
        }
    }
    else {
        var dialogResult = confirm("Создание заявки будет отменено. Нажмите ОК чтобы выйти.")
        if (dialogResult)
            cancel()
    }
})

