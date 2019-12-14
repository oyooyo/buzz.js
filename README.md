# buzz.js

A JavaScript library for using [Buzz!](https://en.wikipedia.org/wiki/Buzz!) controllers in [WebHID](https://wicg.github.io/webhid/)-capable webbrowsers.

## Example

The following tiny example turns the light of every buzz controller on while the buzzer button is pressed.

```javascript
buzz.on('controller_added', function(added_event) {
  return added_event.controller.button['buzzer'].on('changed_state', function(event) {
    event.button.controller.set_light(event.button.is_pressed());
  });
});
```

## Usage

Step 1:
Include the JavaScript file buzz.js in your HTML code, which will make the global variable `buzz` available.

```html
<script src="buzz.js"></script>
```

Step 2:
In order to be able to use attached buzz controllers, the buzz device(s) must be opened. buzz.js cannot automatically open attached buzz devices; as a security measure of WebHID, when trying to open a device, the user will be shown a dialogue where he has to select the device and confirm the selection. As an additional security measure, this must be triggered via a user gesture, for example a button press or a touch event.
If the user wants to attach more than one buzz device (each of which has four controllers), this step must be repeated.

One way to do this is by adding something like this in your HTML code:
```html
<button onclick="buzz.open_device()">Open Buzz! device</button>
```

Step 3:
Use the buzz.js API in your JavaScript code.

## API

### buzz

```
buzz.devices
```

An array containing the available [device](#device)s.

```
buzz.controllers
```

An array containing the available [controller](#controller)s.

```
buzz.open_device()
```

Open a buzz [device](#device). A dialogue will appear, asking the user to select a buzz [device](#device) and confirm the selection. Must be triggered by a user gesture. Returns a Promise that resolves to the [device](#device).

Whenever a [device](#device) was successfully opened, a `"device_added"` event is being emitted, as well as four `"controller_added"` events, one for each [controller](#controller).

```
buzz.on("<event_id>", <callback()>)
```

Register callback `<callback>` for event `<event_id>`. The following events are available:

- `"changed_state"`: Fired if one of the [button](#button)s on one of the [controller](#controller)s of any [device](#device) was either pressed or released.
- `"controller_added"`: Fired if a [controller](#controller) was being added. Since every [device](#device) consists of four [controller](#controller)s, four of these events will be emitted whenever a [device](#device) is being added.
- `"device_added"`: Fired if a [device](#device) was being added.

### Device

```
device.index
```

An integer with the index of this [device](#device), for example 0.

```
device.id
```

A string that identifies this [device](#device), for example "0"

```
device.controllers
```

An array containing the four [controller](#controller)s of the [device](#device).

```
device.output_next_lights()
```

Output the next state of the lights. Should be called after calling `controller.set_next_light(<true or false>)` on multiple [controller](#controller)s.

```
device.on("<event_id>", <callback>)
```

Register callback `<callback>` for event `<event_id>`. The following events are available:

- `"changed_state"`: Fired if one of the [button](#button)s on one of the [controller](#controller)s of this [device](#device) was either pressed or released.

### Controller

```
controller.index
```

An integer with the local index of this [controller](#controller) on the [device](#device) it belongs to, for example 2.

```
controller.id
```

A string that identifies this [controller](#controller), for example "0:2"

```
controller.device
```

The [device](#device) that this [controller](#controller) belongs to.

```
controller.buttons
```

An array containing the five [button](#button)s of the [controller](#controller), in the following order: [<Blue [button](#button)>, <Orange [button](#button)>, <Green [button](#button)>, <Yellow [button](#button)>, <Buzzer/Red [button](#button)>]

```
controller.button
```

An object with the properties:

- "blue"
- "orange"
- "green"
- "yellow"
- "buzzer"
- "red"

making the [button](#button)s accessable by a human-readable key instead of a number.

```
controller.set_light(<true or false>)
```

Set the light on this [controller](#controller) immediately on or off. Shortcut for `controller.set_light(<true or false>); device.output_next_lights();`

```
controller.set_next_light(<true or false>)
```

Sets the light on this [controller](#controller) on or off the next time `device.output_next_lights()` is being called. By using this method instead of `controller.set_light()`, multiple lights can be changed at once.

```
controller.light_is_on()
```

Returns true if the light is currently on.

```
controller.on("<event_id>", <callback()>)
```

Register callback `<callback>` for event `<event_id>`. The following events are available:

- `"changed_state"`: Fired if one of the [button](#button)s of this [controller](#controller) was either pressed or released.

### Button

```
button.index
```

An integer with the local index of this [button](#button) on the [controller](#controller) it belongs to, for example 1.

```
button.id
```

A string that identifies this [button](#button), for example "0:2:1"

```
button.device
```

The [device](#device) that this [button](#button) belongs to.

```
button.controller
```

The [controller](#controller) that this [button](#button) belongs to.

```
button.is_pressed()
```

Returns true if the [button](#button) is currently pressed.

```
button.is_released()
```

Returns true if the [button](#button) is currently released.

```
button.got_pressed()
```

Returns true if the [button](#button) just got pressed.

```
button.got_released()
```

Returns true if the [button](#button) just got released.

```
button.changed_state()
```

Returns true if the [button](#button) just changed state (=either got pressed or released)

```
button.on("<event_id>", <callback()>)
```

Register callback `<callback>` for event `<event_id>`. The following events are available:

- `"changed_state"`: Fired if the [button](#button) was pressed or released.
- `"got_pressed"`: Fired if the [button](#button) got pressed.
- `"got_released"`: Fired if the [button](#button) got released.
- `"press"`: Alias for `"got_pressed"`
- `"release"`: Alias for `"got_released"`
