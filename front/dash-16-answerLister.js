// npm:
const _ = require('underscore')
const $ = require('jquery')

// loc:
const misc = require('./misc.js')
const { uk, app } = require('./dash-00-def.js')

const al = { id: 'answerLister', o: {}, c: {} }

al.getMs = function (nums) {
  // Helper for calculating mean, median, mode, min, & max.
  nums.sort() // Req'd for finding median.
  let total = 0
  const countMap = {}
  let mode = null
  let modeCount = 0
  _.each(nums, function (num) {
    total += num
    countMap[num] = (countMap[num] || 0) + 1
    if (countMap[num] > modeCount) {
      mode = num // <-- WRT multiple modes, only largest returned.
      modeCount = countMap[num]
    }
  })
  const mean = total / nums.length
  const midUpIndex = Math.floor(nums.length / 2)
  let median = 0
  if (nums.length % 2 === 0) {
    median = (nums[midUpIndex - 1] + nums[midUpIndex]) / 2
  } else {
    median = nums[midUpIndex]
  }
  return { mean, median, mode, min: nums[0], max: nums[nums.length - 1] }
}

// Observables & Computeds: ////////////////////////////////
al.o.questionId = uk.observable(null)
// ^-- {queId: true} for each queId for which answers are fetched.
al.c.question = uk.computed(
  function () {
    const questionId = al.o.questionId.get()
    if (!questionId) { return null } // short ckt.
    const question = app.o.questionMap.get()[questionId]
    if (!question) { return null } // short ckt.
    // ==> question found.
    return question
  },
  [al.o.questionId, app.o.questionMap]
)
al.c.answerList = uk.computed(
  function () {
    const question = al.c.question.get()
    if (!question) {
      return [] // Short ckt.
    }
    return _.where(app.o.answerMap.list(), {
      questionId: question._id
    })
  },
  [al.c.question, app.o.answerMap]
)
al.c.choiceMap = uk.computed(
  function () {
    question = al.c.question.get()
    if (!question) {
      return {} // Short ckt.
    }
    const choiceMap = {}
    _.each(question.choiceList, function (choice) {
      choiceMap[choice._id] = choice
    })
    return choiceMap
  },
  [al.c.question]
)
al.c.statCombo = uk.computed(
  function () {
    const SHORT_CKT = {
      choiceStatList: [],
      weightAvg: {}
    }
    const question = al.c.question.get()
    if (!question) { return SHORT_CKT }
    const answerList = al.c.answerList.get()
    if (!answerList.length) { return SHORT_CKT }
    // ^-- Short ckt'ing avoids dividing by zero.
    const weightList = []
    const choiceStatMap = {}
    let totalWeight = 0
    // ^-- Mapping from choiceId to relevant stats/info.
    // Init choiceStatMap:
    _.each(question.choiceList, function (choice) {
      choiceStatMap[choice._id] = choice
      choiceStatMap[choice._id] = {
        // Mapping from choiceId to stats for that choice.
        count: 0,
        percentCount: 0,
        cumWeight: 0,
        percentCumWeight: 0, // <-- 'cum': CUMulative
        choice: choice // <-- Convenient ref. to question.choiceList.$:
      }
    })
    // Update choiceStatMap:
    _.each(answerList, function (answer) {
      const cid = answer.choiceId // Local shorthand.
      console.assert(_.has(choiceStatMap, cid), 'Assert `cid` in choiceStatMap.')
      choiceStatMap[cid].count += 1
      const weight = choiceStatMap[cid].choice.weight // locShort
      weightList.push(weight)
      totalWeight += weight
      choiceStatMap[cid].cumWeight += weight
    })
    _.each(question.choiceList, function (choice) {
      const cid = choice._id // Local shorthand
      choiceStatMap[cid].percentCount = (
        100 * choiceStatMap[cid].count / answerList.length
      )
      choiceStatMap[cid].percentCumWeight = (
        100 * choiceStatMap[cid].cumWeight / totalWeight
      )
    })
    return {
      choiceStatList: _.values(choiceStatMap),
      totalWeight: totalWeight,
      weightMs: al.getMs(weightList)
    }
  },
  [al.c.question, al.c.answerList]
)

// Open: ///////////////////////////////////////////////////
al.open = async function (info) {
  await app.questionLister.fetchQuestionListIfReqd()
  al.o.questionId.set(info.questionId)
  if (!al.c.question.get()) {
    app.router.openDefault()
    return null // Short ckt.
  }
  await al.fetchAnswerListIfReqd()
}
al.fetchAnswerListIfReqd = async function () {
  if (al.c.answerList.get().length) {
    return al.c.answerList.get() // Short ckt.
  }
  return await al.fetchAnswerList()
}
al.fetchAnswerList = async function () {
  misc.spinner.start('Fetching Answers ...')
  const dataToSend = { questionId: al.o.questionId.get() }
  const resp = await misc.postJson('/answerCon/fetchAnswerListByQuestionId', dataToSend)
  // misc.alertJson(resp);
  app.o.answerMap.updateMany(resp.answerList)
  misc.spinner.stop()
  return resp.questionList
}

// Events: /////////////////////////////////////////////////
al.onClick_refresh = function () {
  al.fetchAnswerList()
}

// Close: //////////////////////////////////////////////////
al.close = function () {
  al.o.questionId.set(null)
}

module.exports = al
