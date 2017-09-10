"use strict";

function UtilLibrary() {
    
    function IsEmpty(o) {
        return Object.keys(o).length === 0;
    }
    
    function IsDebug() {
        var netTable = CustomNetTables.GetTableValue( "debug", "log" );
        return netTable && netTable.value;
    }
    
    function DebugMsg() {
        if (IsDebug()) $.Msg.apply(this, arguments);
    }

    function debounce(func, wait, immediate) {
        // 'private' variable for instance
        // The returned function will be able to reference this due to closure.
        // Each call to the returned function will share this common timer.
        var timeout;

        // Calling debounce returns a new anonymous function
        return function() {
            // reference the context and args for the setTimeout function
            var context = this,
                args = arguments;

            // Should the function be called now? If immediate is true
            //   and not already in a timeout then the answer is: Yes
            var callNow = immediate && !timeout;

            // This is the basic debounce behaviour where you can call this 
            //   function several times, but it will only execute once 
            //   [before or after imposing a delay]. 
            //   Each time the returned function is called, the timer starts over.
            $.CancelScheduled(timeout);

            // Set the new timeout
            timeout = $.Schedule(wait, function() {

                // Inside the timeout function, clear the timeout variable
                // which will let the next execution run when in 'immediate' mode
                timeout = null;

                // Check if the function already ran with the immediate flag
                if (!immediate) {
                    // Call the original function with apply
                    // apply lets you define the 'this' object as well as the arguments 
                    //    (both captured before setTimeout)
                    func.apply(context, args);
                }
            });

            // Immediate mode and no wait timer? Execute the function..
            if (callNow) func.apply(context, args);
        };
    }

    // Returns a function, that, when invoked, will only be triggered at most once
    // during a given window of time. Normally, the throttled function will run
    // as much as it can, without ever going more than once per `wait` duration;
    // but if you'd like to disable the execution on the leading edge, pass
    // `{leading: false}`. To disable execution on the trailing edge, ditto.
    function throttle(func, wait, options) {
        var context, args, result;
        var timeout = null;
        var previous = 0;
        if (!options) options = {};
        var later = function() {
            previous = options.leading === false ? 0 : Date.now();
            timeout = null;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
        };
        return function() {
            var now = Date.now();
            if (!previous && options.leading === false) previous = now;
            var remaining = wait - (now - previous);
            context = this;
            args = arguments;
            if (remaining <= 0 || remaining > wait) {
                if (timeout) {
                    $.CancelScheduled(timeout);
                    timeout = null;
                }
                previous = now;
                result = func.apply(context, args);
                if (!timeout) context = args = null;
            } else if (!timeout && options.trailing !== false) {
                timeout = $.Schedule(remaining, later);
            }
            return result;
        };
    }

    function inherits(childCtor, parentCtor) {
        childCtor.prototype = Object.create(parentCtor.prototype);
        childCtor.prototype.constructor = childCtor;
        childCtor.prototype.__super__ = parentCtor.prototype;
    }

    function extend() {
        for (var i = 1; i < arguments.length; i++) {
            for (var key in arguments[i]) {
                if (arguments[i].hasOwnProperty(key)) {
                    arguments[0][key] = arguments[i][key];
                }
            }
        }
        return arguments[0];
    }

    function getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function applyStyle(panel, styles) {
        for (var style in styles) {
            panel.style[style] = styles[style];
        }
    }

    function Collection(items) {
        this.items = items || [];
    }
    extend(Collection.prototype, {
        get: function(i) {
            return this.items[i];
        },
        set: function(i, v) {
            this.items[i] = v;
            return this;
        },
        length: function(v) {
            if (v || v == 0) this.items.length = v;
            return this.items.length;
        },
        isEmpty: function() {
            return !this.items.length;
        },
        last: function() {
            return this.items[this.items.length - 1];
        },
        first: function() {
            return this.items[0];
        },
        remove: function(v) {
            var i = this.items.indexOf(v);
            if (i != -1) return this.splice(i, 1);
        },
        clear: function() {
            return this.splice(0, this.items.length);
        }
    });
    Object.getOwnPropertyNames(Array.prototype).forEach(function(prop) {
        if (typeof(Array.prototype[prop]) == "function") {
            Collection.prototype[prop] = function() {
                var ret = Array.prototype[prop].apply(this.items, arguments);
                return Array.isArray(ret) ? new Collection(ret) : ret;
            };
        }
    });

    function observable(initialValue) {
        var _value = initialValue;
        var _subscribers = [];
        var _notifySubscribers = true;
        var _oldValue;

        function fn(newValue) {
            if (newValue === undefined) return _value;
            _oldValue = _value;
            _value = newValue;
            if (_notifySubscribers) fn.fireSubscriptions();
        }
        fn.subscribe = function(callback) {
            var sub = new subscription(callback);
            _subscribers.push(sub);
            return sub;
        };
        fn.unsubscribe = function(sub) {
            _subscribers.splice(_subscribers.indexOf(sub), 1);
        };
        fn.unsubscribeAll = function() {
            _subscribers.length = 0;
        };
        fn.notifySubscribers = function(newValue) {
            _notifySubscribers = newValue;
        };
        fn.fireSubscriptions = function() {
            _subscribers.forEach(function(sub) {
                sub.callback(_value, _oldValue);
            });
        };
        return fn;
    }

    function subscription(callback) {
        this.callback = callback;
    }

    function mixin(target, src) {
        var source = (typeof src == "function") ? src() : src;
        for (var fn in source) {
            if (source.hasOwnProperty(fn) && fn.name != "init") {
                target.prototype[fn] = source[fn];
            }
        }

        if (typeof source.init == "function") {
            if (target.prototype._mixInits === undefined) {
                target.prototype._mixInits = [];
            }
            target.prototype._mixInits.push(source.init);
        }
    }

    function Mixable() {
        var mixInits = Object.getPrototypeOf(this)._mixInits;
        if (mixInits !== undefined) {
            for (var i = 0; i < mixInits.length; i++) {
                mixInits[i].call(this);
            }
        }
    }

    function MixableArray() {
        var self = extend([], this);
        Object.setPrototypeOf(self, Object.getPrototypeOf(this));
        var mixInits = Object.getPrototypeOf(this)._mixInits;
        if (mixInits !== undefined) {
            for (var i = 0; i < mixInits.length; i++) {
                mixInits[i].call(self);
            }
        }
        return self;
    }
    inherits(MixableArray, Array);

    function mixInPanelProps(props) {
        return {
            init: function() {
                this._props = props;
                if (props) this.addPanelProps(props);
            },
            addPanelProps: function(props) {
                for (var prop in props) {
                    this.addPanelProp(prop, props[prop]);
                }
            },
            addPanelProp: function(prop, initialValue) {
                this[prop] = observable(initialValue);
            },
            bindPanelProps: function(props) {
                props = props || this._props;
                for (var prop in props) {
                    this.bindPanelProp(prop);
                }
            },
            bindPanelProp: function(prop) {
                var self = this;
                switch (prop) {
                    case "draggable":
                        this[prop].subscribe(function(newValue) {
                            self.panel.SetDraggable(newValue);
                        });
                        break;
                    case "parentPanel":
                        this[prop].subscribe(function(newValue) {
                            self.panel.SetParent(newValue);
                        });
                        break;
                    case "cssClasses":
                        this[prop].subscribe(function(newValue, oldValue) {
                            oldValue.forEach(function(c) {
                                if (newValue.indexOf(c) == -1) {
                                    self.panel.RemoveClass(c);
                                }
                            });
                            newValue.forEach(function(c) {
                                if (oldValue.indexOf(c) == -1) {
                                    self.panel.AddClass(c);
                                }
                            });
                        });
                        break;
                    default:
                        this[prop].subscribe(function(newValue) {
                            self.panel[prop] = newValue;
                        });
                        break;
                }
            },
            unbindPanelProps: function(props) {
                for (var prop in props) {
                    this.unbindPanelProp(prop);
                }
            },
            unbindPanelProp: function(prop) {
                this[prop].unsubscribeAll();
            },
            updateProps: function(_props) {
                for (var prop in _props) {
                    if (props.hasOwnProperty(prop) && this.hasOwnProperty(prop)) {
                        this[prop](_props[prop]);
                    }
                }
            }
        };
    }

    function mixInStyleProps(styles) {
        return {
            init: function() {
                this.style = {};
                if (styles) this.addStyles(styles);
            },
            addStyles: function(styles) {
                for (var style in styles) {
                    this.addStyle(style, styles[style]);
                }
            },
            addStyle: function(style, initialValue) {
                this.style[style] = observable(initialValue);
                switch (style) {
                    case "x":
                    case "y":
                    case "z":
                    case "width":
                    case "height":
                        this.style[style].suffix = "px";
                        break;
                    default:
                        this.style[style].suffix = "";
                        break;
                }
            },
            bindStyles: function() {
                for (var prop in this.style) {
                    this.bindStyleProp(prop);
                }
            },
            bindStyleProp: function(prop) {
                var self = this;
                this.style[prop].subscribe(function(newValue) {
                    self.panel.style[prop] = newValue + self.style[prop].suffix;
                });
            },
            unbindStyles: function() {
                for (var prop in this.style) {
                    this.unbindStyleProp(prop);
                }
            },
            unbindStyleProp: function(prop) {
                this.style[prop].unsubscribeAll();
            },
            updateStyles: function(styles) {
                for (var style in this.style) {
                    if (styles.hasOwnProperty(style)) {
                        this.style[style](styles[style]);
                    }
                }
            }
        };
    }

    var mixInEvents = {
        init: function() {
            this._handlers = {};
        },
        registerHandlers: function(events) {
            for (var event in events) {
                this.registerHandler(event, events[event]);
            }
        },
        registerHandler: function(event, handler) {
            this._handlers[event].push(handler);
        },
        unregisterHandler: function(event, handler) {
            if (handler == undefined) {
                this._handlers[event].length = 0;
                return;
            }
            var i = this._handlers[event].indexOf(handler);
            if (i != -1) {
                this._handlers[event].splice(i, 1);
            }
        },
        fireEvent: function(event) {
            var self = this;
            var args = new Array(arguments.length);
            // loop because you shouldn't slice on arguments
            for (var i = 1; i < args.length; ++i) {
                args[i - 1] = arguments[i];
            }
            args[args.length - 1] = self;
            this._handlers[event].forEach(function(handler) {
                handler.apply(self, args);
            });
        }
    };

    function mixInHandlers() {
        var events = ["OnDblClick", "OnContextMenu", "OnFocus", "OnBlur", "OnTabForward",
            "OnActivate", "OnMouseOver", "OnMouseOut", "OnInputSubmit"
        ];
        var dragEvents = ["OnDragEnter", "OnDragDrop", "OnDragLeave", "OnDragStart", "OnDragEnd"];
        var m = {
            init: function() {
                var self = this;
                events.concat(dragEvents).forEach(function(event) {
                    self._handlers[event] = [];
                    if (self[event]) {
                        self.registerHandler(event, self[event].bind(self));
                    }
                });
            },
            bindHandlers: function() {
                events.concat(dragEvents).forEach(this.bindHandler, this);
            },
            bindHandler: function(event) {
                if (dragEvents.indexOf(event) == -1) {
                    this.panel.SetPanelEvent(event.toLowerCase(), this.fireEvent.bind(this, event));
                } else {
                    $.RegisterEventHandler(event.substring(2), this.panel, this.fireEvent.bind(this, event));
                }
            },
            unbindHandlers: function() {
                events.forEach(this.unbindHandler, this);
            },
            unbindHandler: function() {
                this.panel.ClearPanelEvent(event.toLowerCase());
            }
        };
        return m;
    }

    var mixInPanelBind = {
        init: function() {
            this.panel = null;
            this.parent = null;
            this.root = null;
            this.children = [];
        },
        initPanel: function(options) {
            this.panel = options.panel || $.CreatePanel(options.panelType || "Panel", options.parentPanel, options.id || "");
            this.panel.container = this;
            if (options.layoutfile) this.panel.BLoadLayout(options.layoutfile, false, false);
            //if (options.cssClass) this.panel.AddClass(options.cssClass);
            this.root = options.root || this;
            if (options.children) this.createChildren(options);
        },
        bindPanel: function(options) {
            if (!options.skipBindHandlers) this.bindHandlers();
            if (!options.skipBindStyles) {
                this.bindStyles();
                this.updateStyles(options.style || {});
            }
            if (!options.skipPanelProps) {
                this.bindPanelProps();
                this.updateProps(options);
            }
            if (!options.skipRegisterEvents) {
                this.registerHandlers(options.events || {});
            }
        },
        createChildren: function(options) {
            var self = this;
            options.children.forEach(function(childOptions) {
                var childCtor = childOptions.ctor || Panel; //Object.getPrototypeOf(self).constructor;
                childOptions.parentPanel = childOptions.parentPanel || self.panel;
                childOptions.root = self.root;
                var child = new childCtor(childOptions);
                /*if (childOptions.parentPanel && child.parentPanel() != childOptions.parentPanel) {
                  child.parentPanel(childOptions.parentPanel);
                }
                else {
                  child.parentPanel(self.panel);
                }*/
                self.children.push(child);
                child.parent = self;
                child.root = self.root;
            });
        },
        appendChild: function(child) {
            this.children.push(child);
            child.panel.SetParent(this.panel);
        },
        setParent: function(parent) {
            if (this.parent == parent) return;
            if (this.parent) {
                this.parent.children.splice(this.parent.children.indexOf(this), 1);
            }
            this.parent = parent;
            parent.appendChild(this);
        }
    };

    function _Panel(options) {
        if (!options.skipInitPanel) {
            this.initPanel(options);
            if (!options.skipBindPanel) this.bindPanel(options);
        }
        if (options.init) options.init.call(this, options);
    }

    function Panel(options) {
        Mixable.call(this);
        return _Panel.call(this, options);
    }
    inherits(Panel, Mixable);
    mixin(Panel, mixInPanelBind);
    mixin(Panel, mixInStyleProps({
        x: 0,
        y: 0,
        z: 0,
        zIndex: 0,
        width: null,
        height: null
    }, true));
    mixin(Panel, mixInPanelProps({
        draggable: false,
        droppable: true,
        visible: true,
        html: false,
        text: "",
        hittest: false,
        parentPanel: null,
        cssClasses: []
    }, true));
    mixin(Panel, mixInEvents);
    mixin(Panel, mixInHandlers);

    function PanelCollection(options) {
        var self = MixableArray.call(this);
        Object.setPrototypeOf(self, Object.getPrototypeOf(this));
        _Panel.call(self, options);
        return self;
    }
    inherits(PanelCollection, MixableArray);
    mixin(PanelCollection, mixInPanelBind);
    mixin(PanelCollection, mixInStyleProps({
        x: 0,
        y: 0,
        z: 0,
        zIndex: 0,
        width: null,
        height: null
    }, true));
    mixin(PanelCollection, mixInPanelProps({
        draggable: false,
        droppable: true,
        visible: true,
        html: false,
        text: "",
        hittest: false,
        parentPanel: null,
        cssClasses: []
    }, true));
    mixin(PanelCollection, mixInEvents);
    mixin(PanelCollection, mixInHandlers);

    return {
        IsEmpty: IsEmpty,
        IsDebug: IsDebug,
        DebugMsg: DebugMsg,
        debounce: debounce,
        throttle: throttle,
        getRandomInt: getRandomInt,
        applyStyle: applyStyle,
        Collection: Collection,
        observable: observable,
        inherits: inherits,
        extend: extend,
        mixin: mixin,
        Mixable: Mixable,
        MixableArray: MixableArray,
        mixInPanelProps: mixInPanelProps,
        mixInStyleProps: mixInStyleProps,
        mixInEvents: mixInEvents,
        mixInHandlers: mixInHandlers,
        mixInPanelBind: mixInPanelBind,
        Panel: Panel,
        PanelCollection: PanelCollection
    };
}

(function() {
    GameUI.CustomUIConfig().UtilLibrary = new UtilLibrary();

    //$.Msg("util.js");
    /*var panel = $.CreatePanel( "Panel", $.GetContextPanel(), "idtest" );
    $.Msg("util/main.js ", panel.__proto__);

  
    for (var x in $) {
      $.Msg("util/main.js ", x);
    }*/
})();