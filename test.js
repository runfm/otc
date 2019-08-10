function Field(params) {
    this.fieldParam = 10;
    this.visible = true
    controls[params.type].call(this,params)
}

Field.prototype.SetVisibility = function(value){
    this.visible = value
}

Field.prototype = Object.create(Control.prototype);
Field.prototype.constructor = Field;

var controls = {}
controls.Choice = Choice

function Control() {
    this.ControlParam = "sdffffff";
}

Control.prototype.ControlFunc = function(){}

function DropDown(params) {
    Control.call(this,params)
    this.drpdwn = 999
}

DropDown.prototype = Object.create(Control.prototype);
DropDown.prototype.constructor = DropDown;

function ComboBox(params) {
    DropDown.call(this,params)
    this.cmbbx = 777
}

ComboBox.prototype = Object.create(DropDown.prototype);
ComboBox.prototype.constructor = ComboBox;

function Box(params) {
    Control.call(this,params)
    this.boxParam = 72377
}

Box.prototype = Object.create(Control.prototype);
Box.prototype.constructor = Box;

function Choice(params) {
    this.choiceParam = 4444
    if (params.subtype == "Box")
        Box.call(this, params)
    if (params.subtype == "ComboBox")
        ComboBox.call(this, params)
}

/* Choice.prototype = Object.create(Control.prototype);
Choice.prototype.constructor = Choice; */