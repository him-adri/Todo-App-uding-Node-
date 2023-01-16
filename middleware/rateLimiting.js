const AccessModel = require("../models/AccessModel");

const rateLimitng = async (req, res, next) => {
  const sessionId = req.session.id;

  if (!sessionId) {
    return res.send({
      status: 400,
      message: "Invalid Session, Please log in again.",
    });
  }

  const sessionTimeDb = await AccessModel.findOne({ sessionId: sessionId });

  if (!sessionTimeDb) {
    //create the accessmodel
    const accessTime = new AccessModel({
      sessionId: sessionId,
      time: Date.now(),
    });
    await accessTime.save();
    next();
    return;
  }

  const previousAccessTime = sessionTimeDb.time;
  const currentAccessTime = Date.now();

  if (currentAccessTime - previousAccessTime < 2000) {
    return res.send({
      status: 400,
      message: "Too many request. Please try in some time",
    });
  }

  await AccessModel.findOneAndUpdate(
    { sessionId: sessionId },
    { time: Date.now() }
  );

  next();
  return;
};

module.exports = rateLimitng;