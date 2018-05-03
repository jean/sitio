[![npm package](https://img.shields.io/npm/v/sitio.svg?style=flat-square)](https://www.npmjs.org/package/sitio)
![powered by browserify badge](https://img.shields.io/badge/powered%20by-browserify-blue.svg)
![webpack-free badge](https://img.shields.io/badge/webpack-free-orange.svg)

**sitio** is a static site generator that creates ultra fast and thin websites powered by [react](https://facebook.github.io/react/), so it supports isomorphic rendering and responsive clients.

## imperative

**sitio** is imperative, instead of declarative. Most static site generators expect you to arrange files in some structure and spread data around them in some predefined way. You may also have to declare properties, settings and metadata in multiple places, then you run a single command `generate-my-site` and get the resulting html files. **sitio** is different, you instead just write a script that tells it to generate such and such html pages with such and such data, but it also provides helpers so you can have multiple markdown files, for example, and easily loop through them.

## api

**sitio** provides 5 basic methods: `init`, `end`, `generatePage`, `copyStatic` and `listFiles`. `init` takes optionally an object to be merged with the global object and prepares the directory for your static files; `listFiles(options)` gives you the list of files that may be of interest to your rendering process at given paths and glob patterns in general; `generatePage(pathname, componentPath, props)` generates a page at a given location with a given component and some props; `copyStatic(patternsArray)` copies static files to the site directory; and `end` finishes things up.

## quick tutorial

Here's a very simple site we can use **sitio** to generate. First we write a file `generate.js` with the following contents:

```javascript
# generate.js

const {init, end, generatePage} = require('sitio')

async function main () {
  await init({siteName: 'nothing'})
  await generatePage('/', 'landing.js', {})
  await end()
}

main()
```

The above expects a React component to be exported from `landing.js` and one from `contact.js`. It could be something like this:

```javascript
# landing.js

var React = require('react')

module.exports = function LandingPage () {
  return h('div', 'Hello, visitor!')
}
```

Besides that we'll need a file to define the parts of the site that will not change from page to page, which we'll call `body.js` and a file to define the contents of `<head>`, which we'll call `head.js` (they can't be in the same file because updating `<head>` with React is not straightforward, thus we forcibly use [react-safety-helmet](https://github.com/kouhin/react-safety-helmet)).

```javascript
# body.js

var React = require('react')
var Helmet = require('react-safety-helmet').default

module.exports = function Body (props) {
  // the special .location property is passed to all components
  var pathname = props.location.pathname
  
  return [
    h(Helmet, [
      h('meta', {charSet: 'utf-8'}),
      h('title', 'page title'),
      h('link', {href: 'some.css', rel: 'stylesheet'})
    ]),
    h('main', [
      h('h1', 'you are on page ' + pathname)
    ]),
    h('script', {src: '/bundle.js'}) // include /bundle.js at the bottom
  ]
}
```

Now, finally we can generate the site. You must call your `sitio` executable, which is probably at `./node_modules/.bin/sitio` if you installed it with `npm install sitio`. That executable is only necessary because it sets the `NODE_PATH` environment variable, then it just calls your `generate.js` directly.

```shell
sitio generate.js --body=body.js
```

Considering the directory structure given by the 5 files above, it will generate the following at `./_site`:

```
_site/
├── bundle.js
├── contact
│   ├── contact.js
│   └── index.html
├── index.html
└── index.js
```

What does it mean? If you browse to `/` you'll be served with `index.html`, which will then load `bundle.js`. After that point, every internal link you click, for example, `/contact/` will not load `contact/index.html`, but instead `contact/contact.js`, a really small JS file that contains just the props and metadata necessary to render the same DOM that is expressed in HTML form at `contact/index.html`. Because of this, browsing is almost instantaneous.

### making a blog

To write a blog you just need to define a React component in a file, say, 'post.js', then call `generatePage('/blog/<slug>', 'post.js', {content, metadata})` once for every blog post, passing the blog contents and metadata to each page in any format you want.

### a markdown blog from files in the local disk

For that you can use `sitio.listFiles({pattern: 'posts/*.md'})`, which you return all the markdown files in the `posts/` directory [already read](extract.js), then [grab its YAML front-matter](https://www.npmjs.com/package/gray-matter) and [turn their markdown content into HTML](https://www.npmjs.com/package/markdown-it).

### a blog from content on a headless CMS

Since your `generate.js` file is just a normal Nodejs script, you can install any library (`npm install --save-dev <package>`) you need to fetch each post content from your headless CMS, then fetch the contents. Then, write your `post.js` component to match the structure you want for your posts and call `generatePage()` with the data fetched from the headless CMS. Done.

### generating an index, or a list of posts, with pagination

Here the process is the same. Write a `list-of-posts.js` (these names are just examples) component and call `generatePage('/page/2', 'list-of-posts.js', {page: 2, posts: []})` passing the array of posts that will be rendered on each page. Normally you will not want to have all the post contents and metadata rendered on the index of posts, so you must filter out the data you don't want, perhaps [grab an excerpt](https://www.npmjs.com/package/extract-summary) of the post contents and that's it.

## plugins

For advanced users: there are two kinds of plugins, normal plugins and postprocessor plugins.

### normal plugins

You can also import `const {plug} = require('sitio')` and call it with one of our [plugins](https://www.npmjs.com/search?q=keywords:sitio-plugin) to get a bunch of pages generated automatically. `plug` calls take the following arguments:

```javascript
plug(
  pluginName, // like 'sitio-trello' -- the plugin code will be require'd automatically
  rootPath, // a path like '/trello' -- all pages generated will all be put under this
  data, // an object containing any kind of data the plugin may expect
  done // a function that will be called with done(err) as soon as the plugin finishes its job
)
```

Creating a plugin is easy too. Please look at the code on [the plugins subdirectory](plugins) for some examples.

### postprocessors

A postprocessor is a plugin that takes all the data, `{pathname, componentpath, props}`, for all pages already generated in the site. You can use it with `const {postprocess} = require('sitio')`.

Suppose you want to generate an RSS feed, or a search page with all the data statically dumped in the HTML, or perhaps a custom error page that shows a list of all pages on the site -- well, you don't need a postprocessor for these, as you can just write your own login for it in your `generate.js` file, but it may be handy to modularize and pack useful components like postprocessors that do this kind of stuff. Also, if you're generating pages with a [normal plugin](normal-plugin), like the way it's done on [sitios.xyz](https://sitios.xyz/), then you absolutely need a postprocessor.

For more examples on how to do it, please see the code on [the postprocessors subdirectory](postprocessors).

## hosted version

Visit [sitios.xyz](https://sitios.xyz/) for a website creating service that combines [sitio plugins](#plugins) and [classless themes](https://github.com/fiatjaf/classless) to generate and host sites for you without you having to touch any code.

## faq

  * **Why is this better than writing my own single-page application with React?** Because you get static files, in HTML, that work for clients without Javascript. Also, you can use **sitio** as a single-page application generator, since you can use super complex components at any route you want, the benefit is that you won't need a full-featured backend server for routing, since every route will have an `index.html` there waiting to be served you can just use a static server.
  * **Why is this better than writing my own HTML pages manually?** Because you get the nice, fast and lightweight browsing that does not mess with your history.
  * **Why is this better than any other static site generator?** Because of the above, and also because you can use complex rendering logic in React components at specific routes in any way you want. Not only that, you can also code certain pages of your mostly static site to have interactive React components or any single-page application features you want, all this combined with Markdown rendering, for example.
  * **What goes in `bundle.js`?** Basically everything that is not actual content. Your `body` and `helmet` components, all `sitio` dependencies that must be used in client-side, all packages in the `.dependencies` of your `package.json`, all component files declared in `generatePage()` and their relative dependencies. `bundle.js` only needs to be loaded once (or you can opt to not load it at all,  if you just want a bare static site), so it is a good idea to include everything there and only some parameters in the dinamically loaded JS files corresponding to each different page of the site.
  * **What goes in each JS file corresponding to a page in the site?** Everything you pass to it in `generatePage()` (which will include, for example, full texts for blog posts) plus the name of the component that will be used to render it, also given in that function call. Since each of these pages may have lots of text contents, it doesn't make sense to include them all in a single bundle, as other React-based static site generators do. Loading them asynchronously is very fast since they come without HTML boilerplate.
  * **What if I want to use Babel, Buble or other preprocessors?** [browserify](https://github.com/substack/node-browserify) is used under the hood, and you can use [transforms](https://github.com/substack/node-browserify#browserifytransform) by specifying them in your `package.json`. Just remember that your code must be valid on Node.js, as it is run there to generate the static HTML before browserify transforms can do their job.
  * **What if I want to render content from different or external sources?** That's a great use case for **sitio**. If you have content hosted in a headless CMS, a Google Document, a bunch of text files or who-knows-what, then you can just write JS code at your `generate.js` to fetch the content from there and call `generatePage()` with it.
  * **How do I write the site to a different directory?** Pass `--target-dir=./dir` to the executable or set the `TARGET_DIR` environment variable.
  * **What else can I configure?** Really, you want more?

## troubleshooting
  * **Everything is broken!** Sorry, I forgot to say that. Don't install `react` or `react-dom`. These are `sitio` dependencies and will be included by default. If you install them by your own horrible conflicts will happen. Please be aware that some bad React components installed from npm may depend explicitly on React and cause it to be installed too. Bad.
  * **My dependency is missing!** You must have a `package.json` with your dependencies listed at `.dependencies`. That's what happens when you install them with `npm install --save <depname>`.
  * **My site is being generated with sourcemaps!** This is not an error. It is a feature. If you want to turn it off pass `--production` to the executable. Or set the `PRODUCTION` environment variable.
