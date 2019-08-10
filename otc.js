HTMLElement.prototype.createChild = function (params) {
    var child = document.createElement(params.tagName || "div");
    if (typeof params == "string" || params.className) {
        child.className = params.className || params
    }

    child.hidden = params.hidden || false;

    if (params.objectData)
        child.objectData = params.objectData
    if (params.focusable)
        child.setAttribute("tabindex", "-1");
    if (params.placeholder)
        child.placeholder = params.placeholder;
    if (params.editable)
        child.setAttribute("contenteditable", true);
    /*     if (params.className)
            child.className = params.className; */
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
HTMLElement.prototype.createControl = function (params) {
    params.container = this;
    this.customControl = this.createChild(params)
}

var otCustom = {
    Settings: {
        MultipleChoiceDelimiter: ";",
        ChoiceDefaultTextFrom: "Title",
        ChoiceDefaultValueFrom: "UID",
        RelationsRowDelimiter: ":~~:",
        RelationsKeyValueDelimiter: ":~:",
        GridTextValueDelimiter: ":!~:",
        GridRowDelimiter: ":@@:",
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

(function (Controls) {

    //Abstract class Controls.Field
    (function () {
        function Field(params) {
            this.slaveFields = {
                visibility: [],
                filter: []
            };
            this.bundleID = params.bundleID;
            this.columns = params.columns;
            this.fieldID = params.fieldID;
            this.title = params.title;
            this.type = params.type
            this.fieldNames = params.fieldNames
            this.fieldContainer = params.fieldContainer
            this.container = params.container
            this.ChoiceView = params.ChoiceView
            this.validationRule = params.validationRule;
            this.onChangeTrigger = params.onChangeTrigger;
            this.isVisible = (this.fieldContainer) ? !this.fieldContainer.hidden : true;
            this.placeholder = params.placeholder;

            if (this instanceof Controls.ComboBox || this instanceof Controls.Box || this instanceof Controls.Tree) {
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

            if (params.onChange)
                this.onChange = params.onChange;
        };

        Field.prototype.SetVisibility = function (value) {
            this.fieldContainer.hidden = !value;
            this.isVisible = value
        };

        Controls.Field = Field;
    })();

    //Abstract class Controls.Control
    (function () {
        function Control(params) {
            Controls.Field.call(this, params)

            this.__value__ = "";
            this.isValid = (this.validationRule && this.validationRule.Type) ? false : true //Начальное значение 

            var wrapper = this.container.createChild({
                className: "otc-control__wrapper",
                attributes: {
                    "otc-mandatory": (this.validationRule && this.validationRule.ErrorMessage)
                }
            });
            this.contentWrapper = wrapper.createChild("otc-control__content-wrapper");
            this.stateContainer = wrapper.createChild("otc-control__state-container");
        };

        Control.prototype = Object.create(Controls.Field.prototype);
        Control.prototype.constructor = Control;

        Control.prototype.SetIsValid = function (value) {
            this.isValid = value;
            this.stateContainer.setAttribute("otc-valid", value)
        }

        Control.prototype.SetValue = function (value) {
            if (value != this.__value__) {
                this.__value__ = value;

                if (this.validationRule && this.validationRule.Type) {
/*                     if (this.validationRule.Type == "Regex") {
                        var rg = new RegExp(this.validationRule.Query, "gim")
                        this.SetIsValid(!!value.match(rg))
                    }
                    if (this.validationRule.Type == "Exec") {
                        self.isValid = eval(this.validationRule.Query)
                    } */

                    switch (this.validationRule.Type) {
                        case "Regex":
                            var rg = new RegExp(this.validationRule.Query, "gim")
                            this.SetIsValid(!!value.match(rg));
                            break;
                        case "Exec":
                            this.SetIsValid(eval(this.validationRule.Query))
                    }
                }

                if (this.onChange) {
                    this.onChange(this);
                    return
                }
                if (otCustom.onChange)
                    otCustom.onChange();
            }
        };

        Control.prototype.ClearContainer = function (container) {
            while (container.childElementCount) container.removeChild(container.lastChild);
        }

        Controls.Control = Control;
    })();

    //Abstract class Controls.DropDown
    (function () {
        function DropDown(params) {
            var self = this
            Controls.Control.call(this, params)
            this.izDropDownListFrozen = false // блокирует закрытие списка
            this.contentContainer = this.contentWrapper.createChild({
                className: "otc-drop-down",
                focusable: true,
                eventListeners: {
                    focusin: function (e) {
                        self.Open()
                    },
                    focusout: function (e) {
                        if (!this.contains(e.relatedTarget))
                            self.Close()
                    }
                }
            });
            this.selectionWrapper = this.contentContainer.createChild("otc-drop-down__selection-wrapper");
            this.selectedItems = this.selectionWrapper.createChild("otc-drop-down__selected-items");
            this.clearBtn = this.selectionWrapper.createChild({
                className: "otc-selected-items__clear-btn ",
                hidden: true,
                attributes: {
                    title: "Очистить",
                    forcombobox: (this instanceof Controls.ComboBox)
                }
            })

            this.listContainer = this.contentContainer.createChild({
                className: "otc-drop-down__list",
                hidden: true
            });

        };

        DropDown.prototype = Object.create(Controls.Control.prototype);
        DropDown.prototype.constructor = DropDown;

        DropDown.prototype.Open = function () {
            //this.contentContainer.setAttribute("otc-focus-within-emulated", "");
            this.listContainer.hidden = false;
        }
        DropDown.prototype.Close = function () {
            //this.contentContainer.removeAttribute("otc-focus-within-emulated", "");
            if (!this.izDropDownListFrozen) {
                this.listContainer.hidden = true;
                if (this.UpdateValue)
                    this.UpdateValue()
                if (this.ReDraw)
                    this.ReDraw()
            }
        }

        Controls.DropDown = DropDown
    })();

    //Class Controls.ComboBox
    (function () {
        function ComboBox(params) {
            Controls.DropDown.call(this, params);
            var self = this;

            Object.defineProperty(this, "value", {
                get: GetValue,
                set: function (value) {
                    if (value) {
                        var valuesForSet = value.toString().split(";")
                        var valueFrom = this.valueFrom;
                        var textFrom = this.textFrom;
                        for (i = 0; i < valuesForSet.length; i++) {
                            var valueObject = this.dataSource.filter(function (e) {
                                return e[valueFrom] == valuesForSet[i] || e[textFrom] == valuesForSet[i]
                            });
                            if (valueObject.length) {
                                this.Select(valueObject[0])
                                this.UpdateValue();
                            }
                        }
                    }
                    else {
                        this.Clear();
                    }
                }
            });

            this.textFrom = params.textFrom || otCustom.Settings.ChoiceDefaultTextFrom;
            this.valueFrom = params.valueFrom || otCustom.Settings.ChoiceDefaultValueFrom;
            this.additionalTextFrom = params.additionalTextFrom || otCustom.Settings.sfDefaultAdditionalTextFrom

            this.SelectedItemsComponent = new SelectedItemsComponent({
                container: this.selectedItems,
                placeholder: "Выберите...",
                textFrom: this.textFrom,
                valueFrom: this.valueFrom
            });

            this.SelectedItemsComponent.textInput.addEventListener("keydown", function (event) {
                OnCombo__SelectedItems__ContainerKeyDown.call(self, event)
            });
            this.SelectedItemsComponent.textInput.addEventListener("input", function (event) {
                OnCombo__SelectedItems__ContainerInput.call(self, event)
            });


            this.itemsContainer = this.listContainer.createChild("otc-combo__items-container");
            this.itemsState = this.listContainer.createChild("otc-combo__items-state");

            this.selectionWrapper.addEventListener("click", function (e) {
                self.SelectedItemsComponent.textInput.value = ""
            })

            this.contentContainer.addEventListener("click", function (event) {
                if (event.target.objectData && !self.isMultiple)
                    self.Close();
                if (event.target.className == "otc-selected-items__remove-item-btn") {
                    self.SelectedItemsComponent.Remove(event.target.parentElement)

                }
                if (event.target == self.clearBtn)
                    self.Clear()
            });
            this.contentContainer.addEventListener("mousedown", function (event) {
                if (event.target.objectData)
                    self.Select(event.target.objectData)
            });

            this.contentContainer.addEventListener("mouseover", function onMouseOver(event) {
                if (event.target.parentElement == self.itemsContainer)
                    self.SetHover(event.target)
                if (event.target.className == "ot-custom-DropDownAdditionalText")
                    self.SetHover(event.target.parentElement)
            })

            this.contentContainer.addEventListener("mouseout", function (e) {
                self.SetHover(null)
            });

            this.contentContainer.addEventListener("focusout", function (e) {
                self.SelectedItemsComponent.textInput.value = (self.isMultiple) ? "" : self.SelectedItemsComponent.GetNumber() && self.SelectedItemsComponent.SelectedItems[0][self.textFrom] || ""
                this.setAttribute("otc-search-failed", false);
            });
            this.SetVisibleItems(this.dataSource)
        }

        ComboBox.prototype = Object.create(Controls.DropDown.prototype);
        ComboBox.prototype.constructor = ComboBox;

        ComboBox.prototype.SetVisibleItems = function (value) {
            this.itemsState.textContent = (value && value.length || 0) + " items are shown";
            this.shownItems = value;
            this.ClearContainer(this.itemsContainer)
            for (var i = 0; i < (value && value.length || 0); i++) {
                var DOMlistItem = this.itemsContainer.createChild({ textContent: value[i][this.textFrom] });
                DOMlistItem.objectData = value[i];
                if (this.additionalTextFrom) {
                    var subset = [];
                    for (l = 0; l < this.additionalTextFrom.length; l++)
                        subset.push(value[i][this.additionalTextFrom[l]])
                    DOMlistItem.createChild({
                        textContent: subset.join(" > "),
                        className: "ot-custom-DropDownAdditionalText"
                    });
                }
            }
        };

        ComboBox.prototype.ReDraw = function () {
            if (this.dataSource && this.dataSource.length != this.shownItems.length)
                this.SetVisibleItems(this.dataSource)
        };

        ComboBox.prototype.SetHover = function (value) {
            this.hover = value;
            var prevHover = this.itemsContainer.querySelector(".otc-combo__items-container__item_hover");
            if (prevHover)
                prevHover.className = "";
            if (value)
                value.className = "otc-combo__items-container__item_hover";
        };

        ComboBox.prototype.Select = function (item) {
            if (this.isMultiple) {
                this.SelectedItemsComponent.AddItem(item)
                this.TValue = this.SelectedItemsComponent.SelectedItems;
            }
            else {
                this.SelectedItemsComponent.SetItem(item)
                this.Close()
            }

            this.clearBtn.hidden = !(this.SelectedItemsComponent.GetNumber() > 0)
        };

        ComboBox.prototype.UpdateValue = function () {
            this.TValue = this.SelectedItemsComponent.SelectedItems;
            this.SetValue(this.SelectedItemsComponent.GetValue())
        };

        ComboBox.prototype.Clear = function () {
            this.SelectedItemsComponent.Clear();
            //this.Close();
            this.UpdateValue()
            this.clearBtn.hidden = true
        }

        function OnCombo__SelectedItems__ContainerKeyDown(event) {
            switch (event.keyCode) {
                case 13:/*Enter*/
                    if (this.hover)
                        this.Select(this.hover.objectData);
                    break;
                case 8:/*Backspace*/
                    if (this.isMultiple) {
                        this.SelectedItemsComponent.Remove(this.SelectedItemsComponent.textInput.previousElementSibling);
                    }
                    break;
                case 38:/*ArrowUp*/
                    if (this.hover)
                        this.SetHover((this.hover.previousElementSibling) ? this.hover.previousElementSibling : this.itemsContainer.lastElementChild)
                    else
                        this.SetHover(this.itemsContainer.lastElementChild)
                    this.hover.scrollIntoView();
                    break;
                case 40:/*ArrowDown*/
                    if (this.hover)
                        this.SetHover((this.hover.nextElementSibling) ? this.hover.nextElementSibling : this.itemsContainer.firstElementChild)
                    else
                        this.SetHover(this.itemsContainer.firstElementChild)
                    this.hover.scrollIntoView();
                    break;
                case 220:
                case 226:/*BackSlash&IntlBackslash*/
                    event.preventDefault();
                    break;
            }
        }
        function OnCombo__SelectedItems__ContainerInput(event) {
            if (event.target.value) {
                var searchString = event.target.value.replace(/([?$*(){}$\[\]])/gmi, '\\$1'); /* Ecsaping incorrect symbols */
                var regexp = new RegExp(searchString, "gi");
                var filteredDataSource = this.dataSource.filter(function (item) {
                    return Object.keys(item).map(function (e) {
                        return item[e]
                    }).join(";").match(regexp);
                });
                this.contentContainer.setAttribute("otc-search-failed", !(filteredDataSource.length > 0));
                this.SetVisibleItems(filteredDataSource)
            }
            else {
                this.contentContainer.setAttribute("otc-search-failed", false);
                this.SetVisibleItems(this.dataSource)
            }
        }

        Controls.ComboBox = ComboBox
    })();

    //Private component
    var SelectedItemsComponent
    (function () {
        function SelectedItems(params) {
            this.SelectedItems = [];
            this.container = params.container;
            this.textFrom = params.textFrom;
            this.valueFrom = params.valueFrom

            this.textInput = this.container.createChild({
                tagName: "input",
                className: "otc-selected-items__text-input",
                placeholder: params.placeholder
            })
        };

        SelectedItems.prototype.AddItem = function (item) {
            if (this.SelectedItems.indexOf(item) == -1) {
                this.SelectedItems.push(item);
                var selectedHTMLElement = this.container.createChild({
                    className: "otc-selected-items__item",
                    textContent: item[this.textFrom],
                    insertBefore: this.textInput
                });
                selectedHTMLElement.createChild({
                    className: "otc-selected-items__remove-item-btn",
                    attributes: {
                        title: "Удалить выбранный элемент"
                    }
                })
                selectedHTMLElement.objectData = item;
                this.textInput.value = "";
            }
        };

        SelectedItems.prototype.SetItem = function (item) {
            this.SelectedItems[0] = item;
            this.textInput.value = item[this.textFrom]
        };

        SelectedItems.prototype.GetNumber = function () {
            return this.SelectedItems.length
        }

        SelectedItems.prototype.Remove = function (item) {
            if (this.SelectedItems.length) {
                var itemPosition = this.SelectedItems.indexOf(item.objectData);
                this.SelectedItems.splice(itemPosition, 1);
                item.parentElement.removeChild(item);
                this.textInput.focus()
            }
        };
        SelectedItems.prototype.GetValue = function () {
            var valueFrom = this.valueFrom;
            return this.SelectedItems.map(function (item) {
                return item[valueFrom];
            }).join(otCustom.Settings.MultipleChoiceDelimiter || ";");
        };

        SelectedItems.prototype.Clear = function () {
            var selectedDOM = this.container.querySelectorAll(".otc-selected-items__item");
            for (var i = 0; i < selectedDOM.length; i++)
                this.Remove(selectedDOM[i]);
            this.textInput.value = "";
            this.SelectedItems = [];
        }

        SelectedItemsComponent = SelectedItems;
    })();

    //Private component
    var InputNumber;
    (function () {
        function InputNumberControl(params) {
            this.container = params.container
            this.min = params.min || 0
            this.max = params.max
            this.maxLength = params.maxlength || params.length
            this.leadingZeroesFrom = params.leadingZeroesFrom
            this.leadingZeroesTo = params.leadingZeroesTo || 10
            this.onChange = params.onChange
            var self = this

            this.inputElement = this.container.createChild({
                tagName: "input",
                className: "otc-number__input",
                attributes: {
                    maxLength: this.maxLength
                },
                eventListeners: {
                    keydown: InputNumber_OnKeyDown,
                    keyup: function () {
                        return InputNumber_OnKeyUp.call(self);
                    },
                    click: function () {
                        InputNumber_OnClick.call(self)
                    },
                    blur: function () {
                        return InputNumber_OnBlur.call(self)
                    }
                }
            })
        }

        InputNumberControl.prototype.Set = function (value) {
            this.value = value
            this.Check(true)
        }

        InputNumberControl.prototype.SetActivity = function (value) {
            this.inputElement.readOnly = value
        }

        InputNumberControl.prototype.Check = function (checkAll) {
            var enteredNumber = parseInt(this.value);
            if (this.value.length >= this.maxLength || checkAll) {
                if (enteredNumber > this.max)
                    enteredNumber = this.max
                if (enteredNumber < this.min)
                    enteredNumber = this.min
                this.value = enteredNumber.toString()
            }
            leadingZeroesFrom = (checkAll) ? 0 : this.leadingZeroesFrom
            if (this.leadingZeroesFrom && enteredNumber >= leadingZeroesFrom && this.value.length < this.maxLength) {
                var leadZeroesCount = this.maxLength - this.value.length
                var leadZeroesString = ""
                for (var i = 0; i < leadZeroesCount; i++)
                    leadZeroesString += "0"
                this.value = leadZeroesString + enteredNumber
            }
            this.inputElement.value = this.value
        }
        InputNumberControl.prototype.IsFocused = function () {
            return document.activeElement == this.inputElement
        }

        function InputNumber_OnClick(e) {
            this.value = this.inputElement.value;
            this.inputElement.value = ""
        }
        function InputNumber_OnBlur(e) {
            this.Check(true)
            this.onChange && this.onChange()
        }

        function InputNumber_OnKeyDown(event) {
            if (!(event.ctrlKey && event.key == "v") && !event.key.match(/\d|Backspace|ArrowLeft|ArrowRight/gmi))
                event.preventDefault()
        }

        function InputNumber_OnKeyUp(event) {
            this.value = this.inputElement.value
            this.Check()
        }

        InputNumber = InputNumberControl
    })();

    //Private component
    var MonthSetter;
    (function () {
        function MonthSetterControl(params) {
            this.onChange = params.onChange
            this.container = params.container
            this.monthNames = params.monthNames
            var self = this

            var contentContainer = this.container.createChild({
                className: "otc-month-selector__content-container",
                eventListeners: {
                    click: function (e) {
                        return MonthSetter_OnClick.call(self, e)
                    }
                }
            })
            this.prevBtn = contentContainer.createChild("otc-month-selector-btn otc-month-selector__prev-btn")
            var selectorsContainer = contentContainer.createChild("otc-month-selector__selectors-container")
            var monthListContainer = selectorsContainer.createChild("otc-month-selector__month-list-container")
            var yearContainer = selectorsContainer.createChild("otc-month-selector__year-container")
            this.monthList = monthListContainer.createChild({
                className: "otc-month-selector__month-list",
                tagName: "select",
                eventListeners: {
                    change: function (e) {
                        return MonthSetter_OnMonthChanged.call(self, e)
                    }
                }
            })
            for (var i = 0; i < this.monthNames.length; i++) {
                this.monthList.createChild({
                    tagName: "option",
                    textContent: this.monthNames[i],
                    value: i + ""
                })
            }
            this.yearInput = new InputNumber({
                container: yearContainer,
                length: 4,
                min: 1970,
                max: 2099,
                onChange: function (e) {
                    return MonthSetter_OnYearChaged.call(self, e)
                }
            })
            this.nextBtn = contentContainer.createChild("otc-month-selector-btn otc-month-selector__next-btn")
        }

        function MonthSetter_OnClick(e) {
            if (e.target == this.prevBtn)
                this.Previous()
            if (e.target == this.nextBtn)
                this.Next()
        }

        function MonthSetter_OnYearChaged(e) {
            this.cursorDate.setYear(this.yearInput.value)
            this.Set(this.cursorDate)
        }
        function MonthSetter_OnMonthChanged(e) {
            this.cursorDate.setMonth(this.monthList.value)
            this.Set(this.cursorDate)
        }

        MonthSetterControl.prototype.Set = function (value) {
            this.cursorDate = value
            this.cursorDate.setHours(0, 0, 0, 0)
            this.monthList.value = this.cursorDate.getMonth()
            this.yearInput.Set(this.cursorDate.getFullYear())
            this.onChange && this.onChange(this)
        }

        MonthSetterControl.prototype.toString = function () {
            return this.cursorDate.toLocaleString(otCustom.lang || "ru", { month: 'long' }) + " " + this.cursorDate.getFullYear();
        }

        MonthSetterControl.prototype.Next = function () {
            this.cursorDate.setMonth(this.cursorDate.getMonth() + 1, 1);
            this.Set(this.cursorDate)
            return this.getBorders();
        }

        MonthSetterControl.prototype.Previous = function () {
            this.cursorDate.setMonth(this.cursorDate.getMonth() - 1, 1);
            this.Set(this.cursorDate)
            return this.getBorders();
        }

        MonthSetterControl.prototype.getBorders = function () {
            var left = this.cursorDate.setDate(1);
            var firstDayOfMonth = this.cursorDate.getDay() || 7;
            var right = this.cursorDate.setMonth(this.cursorDate.getMonth() + 1, 0);
            var lastDate = this.cursorDate.getDate()
            return {
                left: left,
                right: right,
                firstDayOfMonth: firstDayOfMonth,
                lastDate: lastDate
            }
        }
        MonthSetterControl.prototype.IsFocused = function () {
            return this.yearInput.IsFocused()
        }

        MonthSetter = MonthSetterControl
    })();

    //Private component
    var TimeInput;
    (function () {
        function TimeInputControl(params) {
            var self = this
            this.container = params.container
            this.onChange = params.onChange

            var timeInputWrapper = this.container.createChild("otc-time-input__wrapper")

            this.HourInput = new InputNumber({
                container: timeInputWrapper,
                max: 23,
                length: 2,
                leadingZeroesFrom: 3,
                onChange: function () {
                    return TimeInput_OnHourChanged.call(self)
                }
            })

            timeInputWrapper.createChild({
                textContent: ":"
            })

            this.MinutesInput = new InputNumber({
                container: timeInputWrapper,
                max: 59,
                length: 2,
                leadingZeroesFrom: 6,
                onChange: function () {
                    return TimeInput_OnMinutesChanged.call(self)
                }
            })
        }

        function TimeInput_OnHourChanged() {
            this.hours = parseInt(this.HourInput.value)
            this.onChange && this.onChange()
        }
        function TimeInput_OnMinutesChanged() {
            this.minutes = parseInt(this.MinutesInput.value)
            this.onChange && this.onChange()
        }

        TimeInputControl.prototype.SetActivity = function (value) {
            this.MinutesInput.SetActivity(value)
            this.HourInput.SetActivity(value)
        }

        TimeInputControl.prototype.Set = function (hours, minutes) {
            this.hours = hours;
            this.minutes = minutes
            this.HourInput.Set(hours)
            this.MinutesInput.Set(minutes)
        }

        TimeInputControl.prototype.toString = function () {
            return this.HourInput.value + ":" + this.MinutesInput.value
        }

        TimeInputControl.prototype.IsFocused = function () {
            return this.HourInput.IsFocused() || this.MinutesInput.IsFocused()
        }

        TimeInput = TimeInputControl
    })();

    //Class Controls.Date
    (function () {
        function DatePickerControl(params) {
            Controls.DropDown.call(this, params);
            var self = this;
            this.values = [];

            Object.defineProperty(this, "value", {
                get: GetValue,
                set: function (value) {
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

                        this.Select(new Date(dateParts[2], month, dateParts[0], hour, minute))
                        this.UpdateValue()
                    }
                    if (value.match(/^(3[01]|[12][0-9]|0?[1-9])\.(1[012]|0?[1-9])\.((?:19|20)\d{2})\s\.\.\s(3[01]|[12][0-9]|0?[1-9])\.(1[012]|0?[1-9])\.((?:19|20)\d{2})$/g)) {
                        var dateRangeParts = value.split(" .. ")
                        var leftDateParts = dateRangeParts[0].split(".")
                        var rightDateParts = dateRangeParts[1].split(".")

                        var leftMonth = parseInt(leftDateParts[1] - 1)
                        var rightMonth = parseInt(rightDateParts[1] - 1)

                        this.SetIsRange(true)
                        this.Select(new Date(leftDateParts[2], leftMonth, leftDateParts[0]))
                        this.Select(new Date(rightDateParts[2], rightMonth, rightDateParts[0]))
                        this.SetIsRange(false)
                        this.UpdateValue()
                    }
                }
            });

            this.localeData = {
                "ru": {
                    placeholder: "Выберите дату",
                    days: ["пн", "вт", "ср", "чт", "пт", "сб", "вс"],
                    today: "Сейчас",
                    months: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"]
                },
                "en": {
                    placeholder: "Choose a date",
                    days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
                    today: "Now",
                    months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
                }
            };
            this.lang = otCustom.lang || "ru"
            var days = this.localeData[this.lang].days;

            this.contentContainer.addEventListener("keyup", function (e) {
                /* if (event.keyCode == 16 || event.keyCode == 17)
                    self.isRange = false; */
                return DatePicker_OnKeyUp.call(self, e)
            });
            this.contentContainer.addEventListener("keydown", function (e) {
                return DatePicker_OnKeyDown.call(self, e)
            });

            this.contentContainer.addEventListener("click", function (e) {
                return DatePicker_OnContentContainerClick.call(self, e)
            })

            this.placeholderContainer = this.selectedItems.createChild({
                className: "otc-selected-items__text-input",
                textContent: this.localeData[this.lang].placeholder
            })
            this.selectionWrapper.classList.add("otc-date-picker__icon")
            this.MonthSetter = new MonthSetter({
                container: this.listContainer,
                monthNames: this.localeData[otCustom.lang || "ru"].months,
                onChange: function () {
                    return DatePicker_OnMonthSetterChange.call(self)
                }
            })

            var middleContainer = this.listContainer.createChild("otc-date-picker__middle-container");
            var weeksContainer = middleContainer.createChild("otc-date-picker__week-container");
            for (var i = 0; i < days.length; i++) {
                weeksContainer.createChild({ textContent: days[i] });
            }

            this.DateSelector = middleContainer.createChild("otc-date-picker__day-selector");
            var BottomContainer = this.listContainer.createChild("otc-date-picker__bottom-container");
            this.todayButton = BottomContainer.createChild({
                className: "otc-date-picker__now-btn",
                textContent: this.localeData[otCustom.lang || "ru"].today
            });

            this.TimeInput = new TimeInput({
                container: BottomContainer,
                onChange: function (e) {
                    return DatePicker_OnTimeInputChange.call(self)
                }
            });


            this.MonthSetter.Set(new Date())
            this.TimeInput.Set(0, 0)
        }

        DatePickerControl.prototype = Object.create(Controls.DropDown.prototype);
        DatePickerControl.prototype.constructor = DatePickerControl;

        DatePickerControl.prototype.ShowMonth = function () {
            var todayOA = new Date().setHours(0, 0, 0, 0)
            while (this.DateSelector.childElementCount > 0) this.DateSelector.removeChild(this.DateSelector.lastChild);
            var borders = this.MonthSetter.getBorders()
            var dayOfWeek = borders.firstDayOfMonth //номер дня в неделе, например, если месяц начинается с субботы то dayOfWeek = 6
            for (var i = 1, dd = borders.left; i <= borders.lastDate; i++ , dd += 86400000, dayOfWeek++) {
                if (!weekContainer || dayOfWeek > 7) {
                    var weekContainer = this.DateSelector.createChild("otc-date-picker__week-container");
                    for (var j = 0; j < 7; j++) {
                        var dayCell = weekContainer.createChild("ot-custom-date-daycell");
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
            if (this.values.length)
                this.SetSelection();
        }

        DatePickerControl.prototype.Select = function (selectedDay) {
            if (!this.TimeInput.hours && !this.TimeInput.minutes) {
                //Если время не задано UI элементом TimeInput, задаем время из selectedDay
                this.TimeInput.Set(selectedDay.getHours(), selectedDay.getMinutes())
            }
            var SelectedDayInUnix = selectedDay.setHours(0, 0, 0, 0); //Далее время в дате обнуляется
            if (this.isRange) {
                switch (this.values.length) {
                    case 0:
                        this.values[0] = SelectedDayInUnix;
                        break;
                    case 1:
                        if (SelectedDayInUnix > this.values[0]) {
                            this.values[1] = SelectedDayInUnix;
                        }
                        else {
                            this.values[1] = this.values[0];
                            this.values[0] = SelectedDayInUnix;
                        }
                        break;
                    case 2:
                        if (SelectedDayInUnix < this.values[0]) {
                            this.values[0] = SelectedDayInUnix;
                        }
                        else {
                            this.values[1] = SelectedDayInUnix;
                        }
                        break;
                }
            }
            else {
                this.values = [];
                this.values[0] = SelectedDayInUnix;
            }
            this.SetSelection()
            this.UpdateText()
        }

        DatePickerControl.prototype.SetSelection = function () {
            var previousSelected = this.DateSelector.querySelectorAll("[date-selected]");
            for (var s = 0; s < previousSelected.length; s++)
                previousSelected[s].removeAttribute("date-selected");
            if (this.values && this.values.length) {
                for (var i = (this.values[0]); i <= (this.values[1] || this.values[0]); i += 86400000) {
                    // Бежим от начальной даты в Unix формате до конечной(если выбран диапазон дат) 
                    var dayCell = this.DateSelector.querySelector("[dd='" + i + "']");
                    if (dayCell)
                        dayCell.setAttribute("date-selected", "");
                }
            }
        }

        DatePickerControl.prototype.UpdateText = function () {
            if (this.values && this.values.length) {
                var leftDate = new Date(this.values[0]).toLocaleDateString("ru");
                if (this.values.length > 1)
                    var dateString = leftDate + " .. " + new Date(this.values[1]).toLocaleDateString("ru");
                else
                    if (this.TimeInput.hours || this.TimeInput.minutes)
                        var dateString = leftDate + " " + this.TimeInput.toString()
                    else
                        var dateString = leftDate;
                this.placeholderContainer.textContent = this.text = dateString;
                this.clearBtn.hidden = false
            }
            else {
                this.placeholderContainer.textContent = this.localeData[this.lang].placeholder;
                this.text = ""
                this.clearBtn.hidden = true
            }
        }
        DatePickerControl.prototype.UpdateValue = function () {
            this.SetValue(this.text || "")
        };
        DatePickerControl.prototype.SetIsRange = function (value) {
            this.isRange = value;
            this.contentContainer.className = "otCustom-container dropDownContainer multiple-" + value;
            this.TimeInput.SetActivity(value);
        };
        DatePickerControl.prototype.Clear = function () {
            this.values = []
            this.TimeInput.Set(0, 0)
            this.SetSelection()
            this.UpdateText()
            this.UpdateValue()
        }

        function DatePicker_OnMonthSetterChange(e) {
            this.ShowMonth()
        }

        function DatePicker_OnKeyDown(e) {
            switch (e.key) {
                case "ArrowLeft":
                    this.MonthSetter.Previous()
                    break
                case "ArrowRight":
                    this.MonthSetter.Next()
                    break
            }
            if ((e.keyCode == 16 || e.keyCode == 17) && !this.isRange)
                this.SetIsRange(true)
            if (e.keyCode == 8) {
                if (!this.MonthSetter.IsFocused() && !this.TimeInput.IsFocused())
                    this.Clear()
            }

        }

        function DatePicker_OnKeyUp(event) {
            if ((event.keyCode == 16 || event.keyCode == 17))
                this.SetIsRange(false)
        }

        function DatePicker_OnContentContainerClick(e) {
            if (e.target.hasAttribute("dd"))
                this.Select(new Date(parseInt(e.target.getAttribute("dd"))))
            if (e.target == this.todayButton) {
                this.TimeInput.Set(0, 0)
                this.Select(new Date())
            }

            if (e.target == this.clearBtn)
                this.Clear()
        }

        function DatePicker_OnTimeInputChange() {
            this.UpdateText()
        }
        Controls.Date = DatePickerControl

    })();

    //Class Controls.Memo
    (function () {
        function MemoControl(params) {
            Controls.Control.call(this, params)
            var self = this;

            Object.defineProperty(this, "value", {
                get: GetValue,
                set: function (value) {
                    self.editor.innerHTML = value;
                    self.UpdateValue();
                }
            })

            this.toolsConfiguration = [
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
            this.contentContainer = this.contentWrapper.createChild({
                className: "otc-memo",
                focusable: true,
                eventListeners: {
                    click: function (e) {
                        return Memo_OnContentContainerClick.call(self, e)
                    },
                    focusout: function (e) {
                        if (!this.contains(e.relatedTarget))
                            OnMemoFocusout.call(self)
                    }
                }
            })
            this.tools = this.contentContainer.createChild("otc-memo__tools-container");
            this.editor = this.contentContainer.createChild({
                className: "otc-memo__editor",
                editable: true,
                eventListeners: {
                    keyup: function () {
                        return Memo_OnEditorKeyUp.call(self)
                    },
                    paste: Memo_OnEditorPaste
                }
            });
            for (var i = 0; i < this.toolsConfiguration.length; i++) {
                if (this.toolsConfiguration[i] == "%s")
                    this.tools.createChild("ot-custom-memo-separator");
                else
                    this.tools.createChild({
                        tagName: "button",
                        className: "ot-custom-editor-toolbarBtn",
                        attributes: { "command": this.toolsConfiguration[i] }
                    });
            }
            this.fileControl = this.tools.createChild({
                tagName: "input",
                type: "file",
                hidden: true,
                attributes: {
                    accept: "image/*"
                },
                eventListeners: {
                    "change": function () {
                        return Memo_OnFileSelectorChange.call(self)
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
                        OnMemo__ResizerMouseDown.call(self, e)
                    }
                }
            });
        }

        MemoControl.prototype = Object.create(Controls.Control.prototype);
        MemoControl.prototype.constructor = MemoControl;

        MemoControl.prototype.checkEditorCommands = function () {
            for (var i = 0; i < this.toolsConfiguration.length; i++) {
                if (this.toolsConfiguration[i] != "%s") {
                    var state = document.queryCommandState(this.toolsConfiguration[i]);
                    var btn = this.tools.querySelector("[command='" + this.toolsConfiguration[i] + "']");
                    if (state)
                        btn.setAttribute("activated", "");
                    else
                        btn.removeAttribute("activated", "");
                }
            }
        }

        MemoControl.prototype.UpdateValue = function () {
            if (this.editor.textContent == "" && !this.editor.querySelector("img")) {
                this.SetValue("")
            }
            else {
                this.SetValue(this.editor.innerHTML)
            }
        }

        function OnMemoFocusout() {
            this.UpdateValue()
        }

        function OnMemo__ResizerMouseDown(e) {
            var startY = e.clientY;
            var startHeight = this.editor.clientHeight;
            var editor = this.editor
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

        function Memo_OnEditorPaste(e) {
            if (e.clipboardData && !navigator.userAgent.match(/Firefox/gi)) {
                var blob = e.clipboardData.items[0].getAsFile();
                if (blob) {
                    var base64URL = "";
                    var reader = new FileReader();
                    reader.onloadend = function () {
                        base64URL = reader.result;
                        this.focus();
                        document.execCommand("insertImage", false, base64URL);
                    }
                    reader.readAsDataURL(blob);
                }
            }
        }

        function Memo_OnEditorKeyUp(e) {
            this.editor.style.height = 'auto'
            this.checkEditorCommands();
        }

        function Memo_OnContentContainerClick(event) {
            if (event.target.className == "ot-custom-editor-toolbarBtn") {
                if (event.target.getAttribute("command") == "insertImage")
                    this.fileControl.click();
                else
                    document.execCommand(event.target.getAttribute("command"));
                event.preventDefault();
            }
            this.checkEditorCommands();
        }

        function Memo_OnFileSelectorChange(event) {

            var files = this.fileControl.files
            if (files && files.length && files[0].type.match(/image\/.*/gmi)) {
                var file = files[0];
                var ctx = this
                var base64URL = "";
                this.reader = new FileReader();
                this.reader.onloadend = function () {
                    OnFileReaderLoadEnd.call(ctx)
                }
                this.reader.readAsDataURL(file);
                this.fileControl.value = "";
            }
        }
        function OnFileReaderLoadEnd() {
            this.editor.focus();
            document.execCommand("insertImage", false, this.reader.result);
        }

        Controls.Memo = MemoControl
    })();

    //Class Controls.Box
    (function () {
        function Box(params) {
            Controls.Control.call(this, params)
            var self = this;

            this.textFrom = this.textFrom || otCustom.Settings.ChoiceDefaultTextFrom || "Title";
            this.valueFrom = this.valueFrom || otCustom.Settings.ChoiceDefaultValueFrom || "UID";
            this.boxType = (this.isMultiple) ? "checkbox" : "radio";
            this.selectedItems = [];

            Object.defineProperty(this, "value", {
                get: GetValue,
                set: function (value) {
                    this.Clear()
                    if (value) {
                        var valuesForSet = value.toString().split(";")
                        var valueFrom = this.valueFrom;
                        var textFrom = this.textFrom
                        for (i = 0; i < valuesForSet.length; i++) {
                            var valueObject = this.dataSource.filter(function (e) {
                                return e[valueFrom] == valuesForSet[i] || e[textFrom] == valuesForSet[i]
                            });
                            if (valueObject && valueObject.length) {
                                var choiceItem = this.itemsContainer.querySelector("[value='" + valueObject[0][this.valueFrom] + "']")
                                if (choiceItem)
                                    choiceItem.checked = true;
                            }
                        }
                        this.UpdateValue()
                    }
                }
            });

            this.contentContainer = this.contentWrapper.createChild({
                className: "otc-box__content-container",
                eventListeners: {
                    click: function (event) {
                        OnBoxClick.call(self, event)
                    }
                }
            });

            this.itemsContainer = this.contentContainer.createChild("otc-box__items-container")
            this.clearBtnContainer = this.contentContainer.createChild({
                className: "otc-box__clear-btn-container",
                hidden: true
            })
            this.clearBtn = this.clearBtnContainer.createChild({
                className: "otc-box__clear-btn",
                textContent: "Очистить"
            })
            this.SetVisibleItems(this.dataSource)
        };

        Box.prototype = Object.create(Controls.Control.prototype);
        Box.prototype.constructor = Box;

        Box.prototype.UpdateValue = function () {
            this.selectedItems = [];
            var checkedInputs = this.contentContainer.querySelectorAll("input:checked");
            for (var i = 0; i < checkedInputs.length; i++)
                this.selectedItems.push(checkedInputs[i].objectData);
            this.TValue = this.selectedItems
            var valueFrom = this.valueFrom
            var value = this.selectedItems.map(function (item) {
                return item[valueFrom];
            }).join(";");
            this.clearBtnContainer.hidden = !(this.selectedItems.length > 0)
            this.SetValue(value)
        };

        Box.prototype.SetVisibleItems = function (dataSource) {
            this.ClearContainer(this.itemsContainer)
            for (var i = 0; i < (dataSource && dataSource.length || 0); i++) {
                this.itemsContainer.createChild({
                    className: "otc-box__item",
                    childs: [{
                        tagName: "input",
                        type: this.boxType,
                        value: dataSource[i][this.valueFrom],
                        id: "C_" + this.container.id + "_" + i,
                        name: "C_" + this.container.id,
                        textNode: dataSource[i][this.textFrom],
                        objectData: dataSource[i]
                    }]
                });
            }
        }

        Box.prototype.Clear = function () {
            var checkedInputs = this.contentContainer.querySelectorAll("input:checked");
            for (var i = 0; i < checkedInputs.length; i++)
                checkedInputs[i].checked = false
            this.SetValue("")
            this.clearBtnContainer.hidden = true
            this.TValue = null
        }

        function OnBoxClick(event) {
            if (event.target.className == "otc-box__item")
                event.target.firstElementChild.click();
            if (event.target.type == this.boxType)
                this.UpdateValue();
            if (event.target == this.clearBtn) {
                this.Clear()
            }
        }

        Controls.Box = Box
    })();

    //Class Controls.Text
    (function () {
        function Text(params) {
            Controls.Control.call(this, params);
            var self = this;

            this.textInputWrapper = this.contentWrapper.createChild("otc-text__text-input-wrapper");
            this.textInput = this.textInputWrapper.createChild({
                className: "otc-text__text-input",
                tagName: "input",
                placeholder: "Введите текст",
                eventListeners: {
                    change: function (e) {
                        self.SetValue(this.value)
                    }
                }
            })

            Object.defineProperty(this, "value", {
                get: GetValue,
                set: function (value) {
                    this.textInput.value = value
                    this.SetValue(value)
                }
            })
        }

        Text.prototype = Object.create(Controls.Control.prototype);
        Text.prototype.constructor = Text;



        Controls.Text = Text
    })();

    //Class Controls.Tree
    (function () {
        function Tree(params) {
            Controls.Control.call(this, params);
            var self = this;

            this.textFrom = this.textFrom || otCustom.Settings.ChoiceDefaultTextFrom || "Title";
            this.valueFrom = this.valueFrom || otCustom.Settings.ChoiceDefaultValueFrom || "UID";
            this.boxType = (this.isMultiple) ? "checkbox" : "radio";

            Object.defineProperty(this, "value", {
                get: GetValue,
                set: function (value) {
                    this.Clear()
                    var valuesForSet = value.toString().split(";")
                    var valueFrom = this.valueFrom;
                    var textFrom = this.textFrom
                    for (i = 0; i < valuesForSet.length; i++) {
                        var valueObject = this.dataSource.filter(function (e) {
                            return e[valueFrom] == valuesForSet[i] || e[textFrom] == valuesForSet[i]
                        });
                        if (valueObject && valueObject.length) {
                            var choiceItem = this.treeContainer.querySelector("[value='" + valueObject[0][this.valueFrom] + "']")
                            if (choiceItem)
                                choiceItem.checked = true;
                        }
                    }
                    this.UpdateValue(this.treeContainer)
                    //this.CheckNestedSelectedItems(this.topElement)
                }
            });

            this.treeHashTable = {}
            this.treeScheme = JSON.parse(JSON.stringify(this.dataSource)) // Полная копия входного массива объектов - чтобы изменение схемы не затрагивало входной объект

            for (var i = 0; i < this.treeScheme.length; i++) {
                this.treeScheme[i].Childs = []
                this.treeHashTable[this.treeScheme[i].ExtendedTitle] = this.treeScheme[i] //Подготовка хеш таблицы для быстрого поиска объекта по ExtendedTitle
            }
            for (var i = 0; i < this.treeScheme.length; i++) {
                var Parent = this.treeHashTable[this.treeScheme[i].Parent]
                if (Parent)
                    Parent.Childs.push(this.treeScheme[i])
                else
                    this.topElement = this.treeScheme[i]
            }

            this.treeContainer = this.contentWrapper.createChild({
                className: "otc-tree-view__tree-container",
                eventListeners: {
                    click: function (e) {
                        OnTreeViewContainerClick.call(self, e)
                    }
                }
            })

            this.RenderTreeItem(this.topElement, this.treeContainer)
        }

        Tree.prototype = Object.create(Controls.Control.prototype);
        Tree.prototype.constructor = Tree;

        Tree.prototype.RenderTreeItem = function (item, container) {

            var childs = item.Childs
            var treeItemContainer = container.createChild({
                className: "otc-tree-view__tree-item-container",
                childs: [{
                    className: "otc-tree-view__tree-item-title-container",

                    attributes: {
                        "otc-childs-hidden": true
                    },
                    childs: [
                        {
                            tagName: "input",
                            type: this.boxType,
                            id: item.UID,
                            name: "ct_" + this.container.id,
                            value: item.UID,
                            objectData: item
                        },
                        {
                            className: "otc-tree-view__item-title",
                            textContent: item.ExtendedTitle
                        },
                        {
                            className: "otc-tree-view__tree-item-nested-added-count",
                        }
                    ]
                }]
            })
            if (childs.length) {
                var treeItemChildrenContainer = treeItemContainer.createChild({
                    className: "otc-tree-view__tree-item-children-container",
                    hidden: true
                })

                for (var i = 0; i < childs.length; i++)
                    this.RenderTreeItem(childs[i], treeItemChildrenContainer)
            }
            else
                treeItemContainer.firstElementChild.setAttribute("last", "")
        };

        Tree.prototype.ToggleTreeItem = function (DOMItem) {
            DOMItem.nextElementSibling.hidden = !DOMItem.nextElementSibling.hidden
            DOMItem.setAttribute("otc-childs-hidden", DOMItem.nextElementSibling.hidden)

            this.CheckNestedSelectedItems(DOMItem)
        };

        Tree.prototype.CheckNestedSelectedItems = function (DOMItem) {
            var nestedSelectedContainer = DOMItem.querySelector(".otc-tree-view__tree-item-nested-added-count")
            if (DOMItem.nextElementSibling.hidden) {
                var nestedSelectedDOM = DOMItem.nextElementSibling.querySelector("input:checked")
                if (nestedSelectedDOM)
                    nestedSelectedContainer.setAttribute("otc-tree-nested-shown", true)
                else
                    nestedSelectedContainer.setAttribute("otc-tree-nested-shown", false)
            }
            else
                nestedSelectedContainer.setAttribute("otc-tree-nested-shown", false)
        };

        Tree.prototype.Clear = function () {
            this.TValue = []
            var checkedElements = this.treeContainer.querySelectorAll("input:checked");
            for (var i = 0; i < checkedElements.length; i++)
                checkedElements[i].checked = false
            var nestedSelectedSymbols = this.treeContainer.querySelectorAll("[otc-tree-nested-shown=true]")
            for (var i = 0; i < nestedSelectedSymbols.length; i++)
                nestedSelectedSymbols[i].setAttribute("otc-tree-nested-shown", false)
            this.SetValue("")
        }

        Tree.prototype.UpdateValue = UpdateBoxValue

        function OnTreeViewContainerClick(e) {
            if (e.target.className == "otc-tree-view__tree-item-title-container" && e.target.nextElementSibling)
                this.ToggleTreeItem(e.target)
            if (e.target.className == "otc-tree-view__item-title" && e.target.parentElement.nextElementSibling)
                this.ToggleTreeItem(e.target.parentElement)
            if (e.target.type == this.boxType)
                this.UpdateValue(this.treeContainer)
        }

        Controls.Tree = Tree
    })();

    //Class Controls.Number
    (function () {
        function Number(params) {
            Controls.Control.call(this, params);
            var self = this;

            this.textInputWrapper = this.contentWrapper.createChild("otc-text__text-input-wrapper");
            this.textInput = this.textInputWrapper.createChild({
                className: "otc-text__text-input",
                tagName: "input",
                placeholder: this.placeholder || "Введите число",
                eventListeners: {
                    change: function (e) {
                        self.SetValue(this.value)
                    }
                }
            })
        }

        Number.prototype = Object.create(Controls.Control.prototype);
        Number.prototype.constructor = Number;

        Controls.Number = Number
    })();

    //Class Controls.Grid
    (function () {
        function Grid(params) {
            Controls.Control.call(this, params);
            var self = this;
            this.TValue = []
            this.contentContainer = this.contentWrapper.createChild({
                className: "otc-grid__table-container",
                eventListeners: {
                    click: function (e) {
                        OnGrid__ContainerClick.call(self, e)
                    }
                }
            });

            this.dataTable = this.contentContainer.createChild({
                tagName: "table",
                className: "otc-grid__table"
            });
            this.buttonsContainer = this.contentContainer.createChild("otc-grid__buttons-container");
            this.addRowBtn = this.buttonsContainer.createChild({
                className: "otc-grid__add-row-btn",
                textContent: "Добавить"
            })
            this.removeRowBtn = this.buttonsContainer.createChild({
                className: "otc-grid__remove-row-btn",
                textContent: "Удалить"
            })

            this.dataTableBody = this.dataTable.createTBody();
            this.insertHeaderRow();
            /* this.insertRow() */
        }

        Grid.prototype = Object.create(Controls.Control.prototype);
        Grid.prototype.constructor = Grid;

        Grid.prototype.insertRow = function () {
            var self = this
            var newRow = this.dataTable.insertRow()
            var newRowDataSet = {}
            this.TValue.push(newRowDataSet)
            newRow.objectData = newRowDataSet
            var checkBoxCell = newRow.insertCell()
            checkBoxCell.className = "otc-grid__checkbox-cell"
            checkBoxCell.createChild({
                tagName: "input",
                type: "checkbox"
            })

            var numberCell = newRow.insertCell()
            numberCell.className = "otc-grid__number-cell"
            numberCell.textContent = this.dataTable.rows.length - 1

            for (var i = 0; i < this.columns.length; i++) {
                var newDataCell = newRow.insertCell()
                switch (this.columns[i].Type) {
                    case "Text":
                        newDataCell.customInput = newDataCell.createChild({
                            tagName: "input",
                            eventListeners: {
                                change: function (e) {
                                    OnGrid__CustomInputChange.call(self, e)
                                }
                            }
                        });
                        break;
                    case "Date":
                        newDataCell.customInput = new otCustom.Controls.Date({
                            container: newDataCell,
                            onChange: function (e) {
                                OnGrid__CustomInputChange.call(self, e)
                            }
                        })
                        break;
                    case "Choice":
                        newDataCell.customInput = new otCustom.Controls.ComboBox({
                            container: newDataCell,
                            dataSource: this.columns[i].dataSource,
                            onChange: function (e) {
                                OnGrid__CustomInputChange.call(self, e)
                            }
                        });
                    default:
                        break;
                }
            }
        }

        Grid.prototype.insertHeaderRow = function () {
            this.headerRow = this.dataTable.insertRow()
            this.headerRow.className = "otc-grid__header-row"

            this.headerRow.createChild({
                tagName: "th",
                className: "otc-grid__checkbox-cell",
                childs: [{
                    tagName: "input",
                    type: "checkbox"
                }]
            })

            this.headerRow.createChild({
                tagName: "th",
                className: "otc-grid__number-cell",
                textContent: "#"
            })

            for (var i = 0; i < this.columns.length; i++) {
                this.headerRow.createChild({
                    tagName: "th",
                    textContent: this.columns[i].Title,
                    attributes: {
                        mandatory: (this.columns[i].validationRule ? "true" : "")/* ,
                        bind: this.columns[i].UID */
                    }
                });
            }
        }

        Grid.prototype.getDataBinding = function (cellNumber) {
            return this.columns[cellNumber - 2]
        }

        Grid.prototype.CheckColumnValidation = function (cellNumber) {
            var columnSettings = this.columns[cellNumber - 2]
            if (this.dataTable.rows.length == 1)
                return false
            if (columnSettings.validationRule && columnSettings.validationRule.Type) {
                for (var i = 1; i < this.dataTable.rows.length; i++) {
                    var cellValue = this.dataTable.rows[i].cells[cellNumber].customInput.value
                    if (columnSettings.validationRule.Type == "Regex") {
                        var rg = new RegExp(columnSettings.validationRule.Query, "gim")
                        if (!!!cellValue.match(rg))
                            return false
                    }
                }
            }
            return true
        }

        Grid.prototype.CheckAllColumnsValidation = function () {
            var cells = this.dataTable.rows[0].cells
            var allColumnsAreValid = true;
            for (var i = 2; i < cells.length; i++) {
                var validationResult = this.CheckColumnValidation(i)
                if (!validationResult)
                    allColumnsAreValid = false
                if (cells[i].getAttribute("mandatory") == "true")
                    cells[i].setAttribute("validation-result", validationResult)
            }
            return allColumnsAreValid
        }

        Grid.prototype.UpdateValue = function () {
            var stringifiedRowValues = []
            for (var i = 0; i < this.TValue.length; i++) {
                for (var k in this.TValue[i]) {
                    stringifiedRowValues.push(k + otCustom.Settings.GridTextValueDelimiter + this.TValue[i][k])
                }
            }
            this.SetIsValid(this.CheckAllColumnsValidation())
            this.SetValue(stringifiedRowValues.join(otCustom.Settings.GridRowDelimiter))
        }

        function OnGrid__ContainerClick(e) {
            if (e.target == this.addRowBtn) {
                this.insertRow()
                this.UpdateValue()
            }
            if (e.target.className == "otc-grid__checkbox-cell") {
                e.target.firstElementChild.click()
            }
            if (e.target.type == "checkbox" && e.target.parentElement.parentElement.rowIndex == 0) {
                var checkBoxes = this.dataTable.querySelectorAll("tr:not(:first-child) input[type=checkbox]")
                for (var i = 0; i < checkBoxes.length; i++) {
                    checkBoxes[i].checked = e.target.checked
                }
            }
            if (e.target == this.removeRowBtn) {
                var checkBoxes = this.dataTable.querySelectorAll("tr:not(:first-child) input[type=checkbox]:checked")
                for (var i = 0; i < checkBoxes.length; i++) {
                    var rowForDeletion = checkBoxes[i].parentElement.parentElement
                    var objectDataIdx = this.TValue.indexOf(rowForDeletion.objectData)

                    this.TValue.splice(objectDataIdx, 1)
                    this.dataTable.deleteRow(rowForDeletion.rowIndex)
                    this.headerRow.cells[0].firstElementChild.checked = false
                }

                for (var i = 1; i < this.dataTable.rows.length; i++) // Актуализация номера строки в разметке 
                    this.dataTable.rows[i].cells[1].textContent = i
                this.UpdateValue()
            }
        }

        function OnGrid__CustomInputChange(e) {
            if (e.container)
                var parent = e.container
            else
                var parent = e.target.parentElement
            var columnSettings = this.getDataBinding(parent.cellIndex)
            var cellValue = (parent.customInput.TValue && parent.customInput.TValue.length && parent.customInput.TValue[0].Title && parent.customInput.TValue[0].Title) || parent.customInput.value;
            if (cellValue)
                parent.parentElement.objectData[columnSettings.UID] = cellValue
            else
                delete parent.parentElement.objectData[columnSettings.UID]

            this.UpdateValue()
        }

        Controls.Grid = Grid
    })();

    function GetValue() {
        return this.__value__
    }

    function UpdateBoxValue(container) {
        this.TValue = [];
        var checkedElements = container.querySelectorAll("input:checked")
        for (var i = 0; i < checkedElements.length; i++)
            this.TValue.push(checkedElements[i].objectData)

        var valueFrom = this.valueFrom
        var value = this.TValue.map(function (item) {
            return item[valueFrom];
        }).join(";");

        this.SetValue(value)
    }
})(otCustom.Controls);

function sortTable(table, n) {
    var rows, switching, i, x, y, shouldSwitch, dir, switchcount = 0;
    switching = true;
    //Set the sorting direction to ascending:
    dir = "asc";
    /*Make a loop that will continue until
    no switching has been done:*/
    while (switching) {
        //start by saying: no switching is done:
        switching = false;
        rows = table.rows;
        /*Loop through all table rows (except the
        first, which contains table headers):*/
        for (i = 1; i < (rows.length - 1); i++) {

            //start by saying there should be no switching:
            shouldSwitch = false;
            /*Get the two elements you want to compare,
            one from current row and one from the next:*/
            x = rows[i].getElementsByTagName("TD")[n].customInput.value.toLowerCase();
            y = rows[i + 1].getElementsByTagName("TD")[n].customInput.value.toLowerCase();
            /*check if the two rows should switch place,
            based on the direction, asc or desc:*/
            if (dir == "asc") {
                if (x > y) {
                    //if so, mark as a switch and break the loop:
                    shouldSwitch = true;
                    break;
                }
            }
            else if (dir == "desc") {
                if (x < y) {
                    //if so, mark as a switch and break the loop:
                    shouldSwitch = true;
                    break;
                }
            }
        }
        if (shouldSwitch) {
            /*If a switch has been marked, make the switch
            and mark that a switch has been done:*/
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
            //Each time a switch is done, increase this count by 1:
            switchcount++;
        }
        else {
            /*If no switching has been done AND the direction is "asc",
            set the direction to "desc" and run the while loop again.*/
            if (switchcount == 0 && dir == "asc") {
                dir = "desc";
                switching = true;
            }
        }
    }
}