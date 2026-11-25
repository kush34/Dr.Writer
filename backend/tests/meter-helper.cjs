// Stands in for the user's token balance so tests can exercise the metered (no own key) path.
const User = require("../dist/Models/userModel").default;

exports.mockBalance = (t, balance) => {
  const state = { balance, holds: 0, refunds: 0 };
  t.mock.method(User, "findOneAndUpdate", async (filter, update) => {
    const hold = -update.$inc.token_balance;
    if (state.balance < filter.token_balance.$gte) return null;
    state.balance -= hold;
    state.holds += 1;
    return { _id: filter._id, token_balance: state.balance };
  });
  t.mock.method(User, "updateOne", async (_filter, update) => {
    state.balance += update.$inc.token_balance;
    state.refunds += 1;
    return { modifiedCount: 1 };
  });
  return state;
};
