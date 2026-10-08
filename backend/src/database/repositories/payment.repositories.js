// STATUS: UPDATED

import { Payment } from '../models/payment.model.js';

const createPayment = async (fields) => {
  const payment = new Payment(fields);

  await payment.save();

  return payment;
};

const findByTxRef = async (txRef) => {
  return Payment.findOne({
    txRef,
  }).exec();
};

const findById = async (paymentId) => {
  return Payment.findById(paymentId).exec();
};

const updateByTxRef = async (txRef, updates) => {
  return Payment.findOneAndUpdate(
    { txRef },
    {
      $set: updates,
    },
    {
      new: true,
      runValidators: true,
    },
  ).exec();
};

export {
  createPayment,
  findByTxRef,
  findById,
  updateByTxRef,
};