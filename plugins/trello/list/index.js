const util = require('util')
const Trello = require('node-trello')

const {
  slugify,
  fillWithDates,
  cardPageProps,
  makePagination
} = require('../helpers')

module.exports = async function (root, gen, {
  id,
  apiKey,
  apiToken,
  postsPerPage = 7,
  excerpts = true
}, staticdir) {
  const t = new Trello(apiKey, apiToken)
  const listId = id
  const ppp = postsPerPage
  const get = util.promisify(t.get.bind(t))

  let [cards, {name}] = await Promise.all([
    get(`/1/lists/${listId}/cards`, {
      fields: 'name,desc,due,shortLink,labels',
      attachments: 'cover',
      attachment_fields: 'url',
      checklists: 'all',
      checkItemStates: true,
      members: true,
      member_fields: 'username,avatarHash'
    }),
    get(`/1/lists/${listId}`, {fields: 'name'})
  ])

  cards = cards
    .filter(({name}) => name[0] !== '_')
    .filter(({name}) => name[0] !== '#')

  cards.forEach(card => {
    card.slug = slugify(card.name)
    card.cover = card.attachments ? card.attachments[0].url : null
    card.path = `/${card.slug}`
    card.listName = name

    fillWithDates(card)
  })

  // list page and /p/ afterwards
  var page = 1
  while ((page - 1) * ppp < cards.length) {
    makePagination(gen, '/', cards, page, {ppp, excerpts}, {name, root})
    page++
  }

  // each card page
  cards
    .map(card => {
      gen(`/${card.slug}/`, 'sitio/component-utils/article.js', cardPageProps(card, {root}))
    })
}
