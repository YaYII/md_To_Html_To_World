[![Pollock](https://raw.githack.com/neocotic/pollock/master/images/pollock.png)](https://github.com/neocotic/pollock)

A simple lightweight JavaScript library for adding abstract methods to types which, when called, report a useful error
indicating that they have not been implemented/overridden on the child type.

[![Build Status](https://img.shields.io/travis/neocotic/pollock/develop.svg?style=flat-square)](https://travis-ci.org/neocotic/pollock)
[![Coverage](https://img.shields.io/codecov/c/github/neocotic/pollock/develop.svg?style=flat-square)](https://codecov.io/gh/neocotic/pollock)
[![Dev Dependency Status](https://img.shields.io/david/dev/neocotic/pollock.svg?style=flat-square)](https://david-dm.org/neocotic/pollock?type=dev)
[![License](https://img.shields.io/npm/l/pollock.svg?style=flat-square)](https://github.com/neocotic/pollock/blob/master/LICENSE.md)
[![Release](https://img.shields.io/npm/v/pollock.svg?style=flat-square)](https://www.npmjs.com/package/pollock)

* [Install](#install)
* [API](#api)
* [Bugs](#bugs)
* [Contributors](#contributors)
* [License](#license)

## Install

Install using the package manager for your desired environment(s):

``` bash
$ npm install --save pollock
# OR:
$ bower install --save pollock
```

If you want to simply download the file to be used in the browser you can find them below:

* [Development Version](https://unpkg.com/pollock/dist/pollock.js) (4.6kb - [Source Map](https://unpkg.com/pollock/dist/pollock.js.map))
* [Production Version](https://unpkg.com/pollock/dist/pollock.min.js) (723b - [Source Map](https://unpkg.com/pollock/dist/pollock.min.js.map))

## API

The API couldn't be simpler and consists of a single function, `pollock`:

``` javascript
pollock(type, methodName[, options])
```

The most common use case is to add an abstract instance method to a type (i.e. it's prototype) which, when called,
throws an error:

``` javascript
class GraphicObject {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  moveTo(newX, newY) {
    // ...
  }
}

pollock(GraphicObject, 'draw');
pollock(GraphicObject, 'resize');

class Circle extends GraphicObject {
  draw() {
    // ...
  }

  resize() {
    // ...
  }
}

class Rectangle extends GraphicObject {
  draw() {
    // ...
  }
}
```

By declaring the abstract methods `draw` and `resize`, it will make it much easier/quicker to discover cases where
children of that type have not implemented those methods, but it's important to note it's only reported if/when the
method is called.

``` javascript
const circle = new Circle(0, 0);
circle.draw();
circle.resize();

const rect = new Rectangle(50, 50);
rect.draw();
rect.resize();
//=> Error(GraphicObject#resize abstract method is not implemented)
```

The examples in this document are all using ECMAScript 2015 classes, which your code may not be. Don't worry though,
pollock works with ECMAScript Version 5 as well. ECMAScript 2015 classes were used mainly because they better
demonstrate the inheritance without the noise of different type extension mechanisms.

### Static Methods

While pollock creates instance methods by default, enabling the `static` option will result in the abstract method being
assigned directly to the type instead, effectively making it static.

``` javascript
class GraphicObject {
  // ...
}

pollock(GraphicObject, 'getEdges', { static: true });

class Circle extends GraphicObject {
  static getEdges() {
    return 1;
  }

  // ...
}

class Rectangle extends GraphicObject {
  // ...
}
```

This behaves exactly as you'd expect it to and the only difference is in the error message; the character separating the
type and method names is different. This is to help differentiate such cases while debugging as, in theory, a single
type could have two abstract methods with the same name; one instance and one static.

``` javascript
Circle.getEdges();
//=> 1

Rectangle.getEdges();
//=> Error(GraphicObject.getEdges abstract method is not implemented)
```

### Asynchronous Methods

In most cases, throwing an error as soon as the abstract method is called is best, regardless of whether the method is
intended to be synchronous or asynchronous in nature. However, pollock is flexible and allows you to easily support two
of the most common asynchronous patterns should you wish: callbacks and promises.

#### Callback

In order to have the abstract method invoke a callback function with the error instead of it being thrown, you just need
to specify the index of the callback argument via the `callback` option.

``` javascript
class UserService {
  getUserCount(callback) {
    this.getUsers((error, users) => {
      if (error) {
        callback(error);
      } else {
        callback(null, users.length);
      }
    });
  }
}

pollock(UserService, 'getUser', { callback: 1 });
pollock(UserService, 'getUsers', { callback: 0 });

class UserServiceImpl extends UserService {
  getUsers(callback) {
    // ...
  }
}
```

Now the error will be passed to the specified callback function argument when invoked.

``` javascript
const userService = new UserServiceImpl();
userService.getUser(123, (error) => {
  //=> Error(UserService#getUser abstract method is not implemented)
});
```

If the value of the `callback` option is negative (i.e. less than zero), then it will be applied to the end of argument
list passed to the abstract method. For example; to always treat the last argument as the callback function argument,
pass `-1`.

If the specified index is invalid or does not match an argument that is a function, then the abstract method will fall
back on throwing the error instead.

#### Promise

For the abstract method to return a ECMAScript 2015 `Promise` that has been rejected with the error instead of it being
thrown, simply enable the `promise` option.

``` javascript
class UserService {
  getUserCount() {
    return this.getUsers()
      .then((users) => users.length);
  }
}

pollock(UserService, 'getUser', { promise: true });
pollock(UserService, 'getUsers', { promise: true });

class UserServiceImpl extends UserService {
  getUser(id) {
    // ...
  }
}
```

Done!

``` javascript
const userService = new UserServiceImpl();
userService.getUsers()
  .catch((error) => {
    //=> Error(UserService#getUsers abstract method is not implemented)
  });
```

If the current environment does not support ECMAScript 2015's `Promise`, which is tested by detecting whether it's in
the global scope, then the abstract method will fall back on throwing the error instead.

### Custom Type Name

The type name that is reported in the error message can be controlled using the `typeName` option. The type name
resolution occurs in the following order:

1. `typeName` option, if specified
2. `type.name` property value, if available
3. `"<anonymous>"` otherwise

This can be useful for cases where your code is minified and you don't want errors like "p#lock abstract method is not
implemented" or you're using a library/framework that creates the constructor function for you and results in the
assigned name being lost/distorted.

``` javascript
const GraphicObject = Nevis.extend({
  // ...
});

pollock(GraphicObject, 'draw', { typeName: 'GraphicObject' });
pollock(GraphicObject, 'resize', { typeName: 'GraphicObject' });
```

## Bugs

If you have any problems with pollock or would like to see changes currently in development you can do so
[here](https://github.com/neocotic/pollock/issues).

## Contributors

If you want to contribute, you're a legend! Information on how you can do so can be found in
[CONTRIBUTING.md](https://github.com/neocotic/pollock/blob/master/CONTRIBUTING.md). We want your suggestions and pull
requests!

A list of pollock contributors can be found in [AUTHORS.md](https://github.com/neocotic/pollock/blob/master/AUTHORS.md).

## License

Copyright © 2018 Alasdair Mercer

See [LICENSE.md](https://github.com/neocotic/pollock/raw/master/LICENSE.md) for more information on our MIT license.
