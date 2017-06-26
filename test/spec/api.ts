import * as cxml from "../..";
import * as Promise from "bluebird";
var fs = require("fs");
var path = require("path");
import * as gpml from "../xmlns/pathvisio.org/GPML/2013a";
import * as example from "../xmlns/dir-example";

jasmine.DEFAULT_TIMEOUT_INTERVAL = 20 * 1000;

test("Attach handler w/ _before & _after. Parse string", () => {
  // NOTE: this assertion count is NOT taking into account
  // the commented out expect below regarding
  // "dir instanceof example.document.dir.constructor"
  expect.assertions(8);

  var parser = new cxml.Parser();

  var parser = new cxml.Parser();

  parser.attach(
    class DirHandler extends example.document.dir.constructor {
      /** Fires when the opening <dir> and attributes have been parsed. */

      _after() {
        expect(this).toEqual({ name: "empty" });
      }

      _before() {
        expect(this).toEqual({ name: "empty" });
      }
    },
    "/dir"
  );

  const result = parser.parse('<dir name="empty"></dir>', example.document);

  return result.then((doc: example.document) => {
    expect(doc).toEqual({ dir: { name: "empty" } });
    var dir = doc.dir;

    // TODO why doesn't this pass?
    //expect(dir instanceof example.document.dir.constructor).toBe(true);
    expect(dir instanceof example.document.file.constructor).toBe(false);

    expect(dir instanceof example.DirType).toBe(true);
    expect(dir instanceof example.FileType).toBe(false);

    expect(dir._exists).toBe(true);
    expect(dir.file[0]._exists).toBe(false);
  });
});

test("Attach handler w/ _before & _after. Parse stream.", () => {
  expect.assertions(3);

  var parser = new cxml.Parser();

  parser.attach(
    class DirHandler extends example.document.dir.constructor {
      /** Fires when the opening <dir> and attributes have been parsed. */

      _before() {
        expect(this.name).toBe("123");
      }

      _after() {
        expect(this).toEqual({
          name: "123",
          owner: "me",
          file: [{ name: "test", size: 123, content: "data" }]
        });
      }
    },
    "/dir"
  );

  const result = parser.parse(
    fs.createReadStream(path.resolve(__dirname, "../input/dir-example.xml")),
    example.document
  );

  return result.then((doc: example.document) => {
    expect(doc).toEqual({
      dir: {
        name: "123",
        owner: "me",
        file: [
          {
            name: "test",
            size: 123,
            content: "data"
          }
        ]
      }
    });
  });
});

test("Attach handler w/ _before & _after. Parse both string and stream.", () => {
  expect.assertions(11);

  var parser = new cxml.Parser();

  parser.attach(
    class DirHandler extends example.document.dir.constructor {
      /** Fires when the opening <dir> and attributes have been parsed. */

      _before() {
        expect(typeof this.name).toBe("string");
      }

      /** Fires when the closing </dir> and children have been parsed. */

      _after() {
        expect(typeof this.name).toBe("string");
      }
    },
    "/dir"
  );

  const resultFromString = parser.parse(
    '<dir name="empty"></dir>',
    example.document
  );

  const resultFromStream = parser.parse(
    fs.createReadStream(path.resolve(__dirname, "../input/dir-example.xml")),
    example.document
  );

  return Promise.all([resultFromString, resultFromStream]).then(function(
    [docFromString, docFromStream]: [example.document, example.document]
  ) {
    expect(docFromString).toEqual({ dir: { name: "empty" } });

    var dirFromString = docFromString.dir;

    // TODO why doesn't this pass?
    //expect(dirFromString instanceof example.document.dir.constructor).toBe(true);
    expect(dirFromString instanceof example.document.file.constructor).toBe(
      false
    );

    expect(dirFromString instanceof example.DirType).toBe(true);
    expect(dirFromString instanceof example.FileType).toBe(false);

    expect(dirFromString._exists).toBe(true);
    expect(dirFromString.file[0]._exists).toBe(false);

    expect(docFromStream).toEqual({
      dir: {
        name: "123",
        owner: "me",
        file: [
          {
            name: "test",
            size: 123,
            content: "data"
          }
        ]
      }
    });
  });
});

//test("attach to and parse broken Pathway from string", () => {
//  expect.assertions(3);
//
//  var parser = new cxml.Parser();
//  parser.attach(
//    class CustomHandler extends gpml.document.Pathway.constructor {
//      _before() {
//        console.log("this _before");
//        console.log(this);
//        expect(typeof this).toBe("object");
//      }
//
//      _after() {
//        console.log("this _after");
//        console.log(this);
//        expect(typeof this).toBe("object");
//      }
//    },
//    "/Pathway"
//  );
//  return parser
//    .parse(
//      '<DataNode Name="sample pathway"><Comment>hello there</Comment></DataNode>',
//      gpml.document
//    )
//    .then(doc => {
//      expect(typeof doc).toBe("object");
//    });
//});

[
  `<gpml:Pathway xmlns:gpml="http://pathvisio.org/GPML/2013a" Name="sample pathway">
		<gpml:Comment>hello there</gpml:Comment>
	</gpml:Pathway>`,

  `<Pathway xmlns:x="http://pathvisio.org/GPML/2013a" Name="sample pathway">
		<Comment>hello there</Comment>
	</Pathway>`,

  `<Pathway xmlns="http://pathvisio.org/GPML/2013a" Name="sample pathway">
		<Comment>hello there</Comment>
	</Pathway>`,

  `<Pathway Name="sample pathway">
		<Comment>hello there</Comment>
	</Pathway>`
]
  .reduce(function(acc, pathway) {
    acc.push(pathway);
    acc.push('<?xml version="1.0" encoding="utf-8"?>\n' + pathway);
    return acc;
  }, [])
  .concat([
    fs.createReadStream(path.resolve(__dirname, "../input/simple.gpml"))
  ])
  .forEach(function(input, i) {
    test(`Attach handlers w/ _before & _after. Parse simple GPML (input index: ${i}).`, () => {
      expect.assertions(6);

      var parser = new cxml.Parser();
      parser.attach(
        class CustomHandler extends gpml.document.Pathway.constructor {
          _before() {
            expect(this.Name).toBe("sample pathway");
            expect(this.Comment[0]._exists).toBe(false);
          }

          _after() {
            expect(this.Name).toBe("sample pathway");
            expect(this.Comment[0].content).toBe("hello there");
          }
        },
        "/Pathway"
      );

      return parser.parse(input, gpml.document).then(doc => {
        const pathway = doc.Pathway;
        expect(pathway.Name).toBe("sample pathway");
        expect(pathway.Comment[0].content).toBe("hello there");
      });
    });
  });

test("Attach handler w/ _before & _after for Pathway/FakeElement. Parse simple GPML string.", () => {
  expect.assertions(1);

  var parser = new cxml.Parser();
  parser.attach(
    class CustomHandler extends gpml.document.Pathway.constructor {
      _before() {
        expect(typeof this).toBe("object");
      }

      _after() {
        expect(typeof this).toBe("object");
      }
    },
    "/Pathway/FakeElement"
  );
  return parser
    .parse(
      '<Pathway Name="sample pathway"><Comment>hello there</Comment></Pathway>',
      gpml.document
    )
    .then(doc => {
      expect(typeof doc).toBe("object");
    });
});

test("Attach handler w/ _before & _after for Pathway/Comment. Parse simple GPML string.", () => {
  expect.assertions(3);

  var parser = new cxml.Parser();
  parser.attach(
    class CustomHandler extends gpml.document.Pathway.Comment[0].constructor {
      _before() {
        expect(typeof this).toBe("object");
      }

      _after() {
        expect(typeof this).toBe("object");
      }
    },
    "/Pathway/Comment"
  );
  return parser
    .parse(
      '<Pathway Name="sample pathway"><Comment>hello there</Comment></Pathway>',
      gpml.document
    )
    .then(doc => {
      expect(typeof doc).toBe("object");
    });
});

test("Attach handler for Pathway/DataNode/Comment. Parse simple GPML string", () => {
  expect.assertions(6);

  var parser = new cxml.Parser();

  parser.attach(
    class CustomHandler extends gpml.document.Pathway.DataNode[0].Comment[0]
      .constructor {
      _before() {
        expect(this.content).toBe(undefined);
        expect(this.Source).toBe("my-datanode-comment-source");
      }

      _after() {
        expect(this.content).toBe("my-datanode-comment");
        expect(this.Source).toBe("my-datanode-comment-source");
      }
    },
    "/Pathway/DataNode/Comment"
  );

  return parser
    .parse(
      `<Pathway Name="sample pathway">
				<Comment Source="my-pathway-comment-source">my-pathway-comment</Comment>
				<DataNode>
					<Comment Source="my-datanode-comment-source">my-datanode-comment</Comment>
				</DataNode>
			</Pathway>`,
      gpml.document
    )
    .then(doc => {
      const comment = doc.Pathway.DataNode[0].Comment[0];
      expect(comment.content).toBe("my-datanode-comment");
      expect(comment.Source).toBe("my-datanode-comment-source");
    });
});

test("Attach handler w/ _before & _after for Pathway. Parse one-of-each GPML stream.", () => {
  expect.assertions(3);

  var parser = new cxml.Parser();
  parser.attach(
    class CustomHandler extends gpml.document.Pathway.constructor {
      _before() {
        expect(typeof this).toBe("object");
      }

      _after() {
        expect(typeof this).toBe("object");
      }
    },
    "/Pathway"
  );

  return parser
    .parse(
      fs.createReadStream(path.resolve(__dirname, "../input/one-of-each.gpml")),
      gpml.document
    )
    .then(doc => {
      expect(typeof doc).toBe("object");
    });
});

test("Attach handler w/ _before & _after for Pathway/DataNode/Comment. Parse one-of-each GPML stream.", () => {
  expect.assertions(4);

  var parser = new cxml.Parser();

  parser.attach(
    class CustomHandler extends gpml.document.Pathway.DataNode[0].Comment[0]
      .constructor {
      _before() {
        expect(typeof this).toBe("object");
      }

      _after() {
        expect(this.content).toBe("DataNode comment");
      }
    },
    "/Pathway/DataNode/Comment"
  );

  return parser
    .parse(
      fs.createReadStream(path.resolve(__dirname, "../input/one-of-each.gpml")),
      gpml.document
    )
    .then(doc => {
      const comment = doc.Pathway.DataNode[1].Comment[0];
      expect(comment.content).toBe("DataNode comment");
      expect(typeof doc.Pathway.Graphics).toBe("object");
    });
});

test("Attach handlers for both Pathway/Comment & Pathway/DataNode/Comment. Parse.", () => {
  expect.assertions(6);

  var parser = new cxml.Parser();

  parser.attach(
    class CustomHandler extends gpml.document.Pathway.Comment[0].constructor {
      _before() {
        expect(typeof this).toBe("object");
      }

      _after() {
        expect(this.content).toBe("pathway wide comment");
      }
    },
    "/Pathway/Comment"
  );

  parser.attach(
    class CustomHandler extends gpml.document.Pathway.DataNode[0].Comment[0]
      .constructor {
      _before() {
        expect(typeof this).toBe("object");
      }

      _after() {
        expect(this.content).toBe("DataNode comment");
      }
    },
    "/Pathway/DataNode/Comment"
  );

  return parser
    .parse(
      fs.createReadStream(path.resolve(__dirname, "../input/one-of-each.gpml")),
      gpml.document
    )
    .then(doc => {
      const comment = doc.Pathway.DataNode[1].Comment[0];
      expect(comment.content).toBe("DataNode comment");
      expect(typeof doc.Pathway.Graphics).toBe("object");
    });
});

test("Attach handlers for both Pathway/Comment & Pathway/DataNode. Parse.", () => {
  expect.assertions(16);

  var parser = new cxml.Parser();

  parser.attach(
    class CustomHandler extends gpml.document.Pathway.Comment[0].constructor {
      _before() {
        expect(typeof this).toBe("object");
      }

      _after() {
        expect(this.content).toBe("pathway wide comment");
      }
    },
    "/Pathway/Comment"
  );

  parser.attach(
    class CustomHandler extends gpml.document.Pathway.DataNode[0].constructor {
      _before() {
        expect(typeof this).toBe("object");
      }

      _after() {
        expect(typeof this).toBe("object");
      }
    },
    "/Pathway/DataNode"
  );

  return parser
    .parse(
      fs.createReadStream(path.resolve(__dirname, "../input/one-of-each.gpml")),
      gpml.document
    )
    .then(doc => {
      const comment = doc.Pathway.DataNode[1].Comment[0];
      expect(comment.content).toBe("DataNode comment");
      expect(typeof doc.Pathway.Graphics).toBe("object");
    });
});
