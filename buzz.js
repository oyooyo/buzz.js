(function() {
  'use strict';
  var Button, Buzz, Controller, Device, Event_Emitter, bit_in_byte_array_is_set, bit_in_value_is_set, copy_into, databuffer_to_byte_array, ensure_webhid_is_available, webhid_is_available;

  // A class that can emit events
  Event_Emitter = class {
    constructor() {
      this.events = {};
      return;
    }

    add_listener(event_id, event_listener) {
      if (!this.events.hasOwnProperty(event_id)) {
        this.events[event_id] = [];
      }
      this.events[event_id].push(event_listener);
      return this;
    }

    remove_listener(event_id, event_listener) {
      var event_listener_index, event_listeners;
      if (this.events.hasOwnProperty(event_id)) {
        event_listeners = this.events[event_id];
        event_listener_index = event_listeners.indexOf(event_listener);
        if (event_listener_index >= 0) {
          event_listeners.splice(event_listener_index, 1);
        }
      }
      return this;
    }

    once(event_id, event_listener) {
      var proxy_listener;
      proxy_listener = function() {
        this.removeListener(event_id, proxy_listener);
        return event_listener.apply(this, arguments);
      };
      this.add_listener(event_id, proxy_listener);
      return this;
    }

    emit(event_id) {
      var arguments_array, event_listener, i, len, ref;
      arguments_array = Array.prototype.slice.call(arguments, 1);
      if (this.events.hasOwnProperty(event_id)) {
        ref = this.events[event_id].slice();
        for (i = 0, len = ref.length; i < len; i++) {
          event_listener = ref[i];
          event_listener.apply(this, arguments_array);
        }
      }
      return this;
    }

    on() {
      this.add_listener.apply(this, arguments);
      return this;
    }

    fire() {
      this.emit.apply(this, arguments);
      return this;
    }

  };

  // Returns true if the bit with index <bit_index> in value <value> is set, false otherwise
  bit_in_value_is_set = function(bit_index, value) {
    return (value & (1 << bit_index)) !== 0;
  };

  // Returns true if the bit with index <bit_index> in byte array <byte_array> is set, false otherwise
  bit_in_byte_array_is_set = function(bit_index, byte_array) {
    return bit_in_value_is_set(bit_index % 8, byte_array[Math.floor(bit_index / 8)]);
  };

  // This class represents a single button on one of the buzz controllers
  Button = class extends Event_Emitter {
    constructor(controller1, index1) {
      super();
      this.controller = controller1;
      this.index = index1;
      this.id = `${this.controller.id}:${this.index}`;
      this.bit_index = 20 + (this.controller.index * 5) - this.index;
      this.device = this.controller.device;
      this.device.on('changed_state', () => {
        var event;
        if (this.changed_state()) {
          event = {
            button: this,
            controller: this.controller,
            device: this.device
          };
          this.emit('changed_state', event);
          if (this.is_pressed()) {
            this.emit('got_pressed', event);
            this.emit('press', event);
          } else {
            this.emit('got_released', event);
            this.emit('release', event);
          }
        }
      });
      return;
    }

    is_pressed() {
      return bit_in_byte_array_is_set(this.bit_index, this.device.state);
    }

    was_pressed() {
      return bit_in_byte_array_is_set(this.bit_index, this.device.last_state);
    }

    is_released() {
      return !this.is_pressed();
    }

    was_released() {
      return !this.was_pressed();
    }

    got_pressed() {
      return this.is_pressed() && (!this.was_pressed());
    }

    got_released() {
      return this.was_pressed() && (!this.is_pressed());
    }

    changed_state() {
      return this.is_pressed() !== this.was_pressed();
    }

    toString() {
      return `<Buzz Button ${this.id}>`;
    }

  };

  // This class represents a single buzz controller
  Controller = class extends Event_Emitter {
    constructor(device1, index1) {
      var index;
      super();
      this.device = device1;
      this.index = index1;
      this.id = `${this.device.id}:${this.index}`;
      this.buttons = (function() {
        var i, results;
        results = [];
        for (index = i = 0; i < 5; index = ++i) {
          results.push(new Button(this, index));
        }
        return results;
      }).call(this);
      this.button = {
        'blue': this.buttons[0],
        'orange': this.buttons[1],
        'green': this.buttons[2],
        'yellow': this.buttons[3],
        'red': this.buttons[4],
        'buzzer': this.buttons[4]
      };
      this.device.on('changed_state', () => {
        var button, i, len, ref;
        ref = this.buttons;
        for (i = 0, len = ref.length; i < len; i++) {
          button = ref[i];
          if (button.changed_state()) {
            this.emit('changed_state', {
              controller: this,
              device: this.device
            });
            break;
          }
        }
      });
    }

    light_is_on() {
      return this.device.lights[1 + this.index] !== 0;
    }

    set_next_light(light_on) {
      this.device.next_lights[1 + this.index] = (light_on ? 0xFF : 0x00);
    }

    set_light(light_on) {
      this.set_next_light(light_on);
      return this.device.output_next_lights();
    }

    toString() {
      return `<Buzz Controller ${this.id}>`;
    }

  };

  // Copy the elements in array <source_array> into <target_array>
  copy_into = function(target_array, source_array) {
    var i, index, ref;
    for (index = i = 0, ref = source_array.length; i < ref; index = i += 1) {
      target_array[index] = source_array[index];
    }
  };

  // Convert DataBuffer <databuffer> to an array of uint8 numbers
  databuffer_to_byte_array = function(databuffer) {
    var i, offset, ref, results;
    results = [];
    for (offset = i = 0, ref = databuffer.byteLength; (0 <= ref ? i < ref : i > ref); offset = 0 <= ref ? ++i : --i) {
      results.push(databuffer.getUint8(offset));
    }
    return results;
  };

  // This class represents a single buzz device with four buzz controllers
  Device = class extends Event_Emitter {
    constructor(hid_device1, index1) {
      var index;
      super();
      this.hid_device = hid_device1;
      this.index = index1;
      this.id = `${this.index}`;
      this.lights = [];
      this.next_lights = [0, 0, 0, 0, 0, 0, 0];
      this.controllers = (function() {
        var i, results;
        results = [];
        for (index = i = 0; i < 4; index = ++i) {
          results.push(new Controller(this, index));
        }
        return results;
      }).call(this);
      return;
    }

    output_next_lights() {
      return this.hid_device.sendReport(0, Uint8Array.from(this.next_lights)).then(() => {
        copy_into(this.lights, this.next_lights);
      });
    }

    set_all_lights(light_on) {
      var controller, i, len, ref;
      ref = this.controllers;
      for (i = 0, len = ref.length; i < len; i++) {
        controller = ref[i];
        controller.set_next_light(light_on);
      }
      return this.output_next_lights();
    }

    initialize() {
      // TODO There currently seems to be no way to query the initial state: https://github.com/WICG/webhid/issues/10
      this.state = [0, 0, 0, 0, 0];
      this.last_state = [0, 0, 0, 0, 0];
      this.hid_device.addEventListener('inputreport', (event) => {
        copy_into(this.last_state, this.state);
        copy_into(this.state, databuffer_to_byte_array(event.data));
        this.emit('changed_state', {
          device: this
        });
      });
      return this.output_next_lights();
    }

    toString() {
      return `<Buzz Device ${this.id}>`;
    }

  };

  // Returns true if WebHID is available, false otherwise
  webhid_is_available = function() {
    return navigator.hid !== void 0;
  };

  // Returns a Promise that resolves if WebHID is available and rejects if not
  ensure_webhid_is_available = function() {
    return (webhid_is_available() ? Promise.resolve() : Promise.reject('WebHID is not available'));
  };

  // This class represents the global controller/manager
  Buzz = class extends Event_Emitter {
    constructor() {
      super();
      this.devices = [];
      this.controllers = [];
      this.set_all_lights = (light_on) => {
        var device;
        return Promise.all((function() {
          var i, len, ref, results;
          ref = this.devices;
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            device = ref[i];
            results.push(this.device.set_all_lights(light_on));
          }
          return results;
        }).call(this));
      };
      this.output_next_lights = () => {
        var device;
        return Promise.all((function() {
          var i, len, ref, results;
          ref = this.devices;
          results = [];
          for (i = 0, len = ref.length; i < len; i++) {
            device = ref[i];
            results.push(this.device.output_next_lights());
          }
          return results;
        }).call(this));
      };
      this.open_device = () => {
        return ensure_webhid_is_available().then(() => {
          return navigator.hid.requestDevice({
            filters: [
              {
                vendorId: 0x054c,
                productId: 0x1000
              }
            ]
          }).then((hid_device) => {
            return hid_device.open().then(() => {
              var device;
              device = new Device(hid_device, this.devices.length);
              return device.initialize().then(() => {
                var controller, i, len, ref;
                device.on('changed_state', () => {
                  this.emit('changed_state', {
                    device: device
                  });
                });
                this.devices.push(device);
                this.emit('device_added', {
                  device: device
                });
                ref = device.controllers;
                for (i = 0, len = ref.length; i < len; i++) {
                  controller = ref[i];
                  this.controllers.push(controller);
                  this.emit('controller_added', {
                    controller: controller,
                    device: device
                  });
                }
                return device;
              });
            });
          });
        });
      };
    }

  };

  // Assign the global "buzz" variable
  window.buzz = new Buzz();

}).call(this);
