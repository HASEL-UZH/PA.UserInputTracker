import assert from 'assert'
import { UserInputTracker } from '../index'

test('smoke test iohook', done => {
  const tracker = new UserInputTracker((data) => {
    assert.equal(data.tsStart instanceof Date, true)
    tracker.stop()
    tracker.terminate()
    done()
  }, 1000)

  tracker.start()
}, 3000)

