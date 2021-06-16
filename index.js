const functions = require("firebase-functions");
const fetch = require('node-fetch'); 
const BASE_URL = 'https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=50&status=approved&offset=';
const moment = require("moment")
const lodash = require("lodash");

exports.allPayments = functions.https.onRequest(async (request, response) => {
    try {
        let offset = 0;
        const amount = request.body.amount != null ? request.body.amount : 10000;
        const delta = request.body.delta != null ? request.body.delta : 0.01;
        if (isNaN(amount) || amount <= 0) throw new AppError(400, "El amount debe ser mayor que 0");
        if (isNaN(delta) || !lodash.inRange(delta, 0.00, 0.10)) throw new AppError(400, "El delta debe estar entre 0.00 y 0.09");
        const ACCESS_TOKEN = request.headers.authorization;
        const currentMonth = moment().month();
        let allPayments = [];
        let done = false;
        while (!done) {
          const lastPayments = await getLastPayments(offset, ACCESS_TOKEN);
          if (lastPayments.status === 401) throw new AppError(401, "unauthorized");
          const processedPayments = getProcessedPayments(lastPayments);
          if (processedPayments.some(pp => pp.month !== currentMonth)){
              const inMonthPayments = processedPayments.filter(pp => pp.month === currentMonth);
              allPayments = [...allPayments, ...inMonthPayments];
              done = true;
          } else {
              allPayments = [...allPayments, ...processedPayments];
              offset += 50;
          }
        }
        const hxDiscountPayments = allPayments.filter(pp => pp.discount === 0.7);
        const lastHxDiscount = hxDiscountPayments.length > 0 ? moment(hxDiscountPayments[0].date_approved) : moment(new Date()).startOf('month');
        const otherDiscountPayments = allPayments.filter(pp => pp.discount > 0.0 && pp.discount !== 0.7 && moment(pp.date_approved) > lastHxDiscount);
        let used = hxDiscountPayments.reduce((total, current) => total + current.coupon_amount, 0);
        const maximum = roundToTwo(amount * 0.7);
        if (otherDiscountPayments.length > 0 && used < maximum) {
            const fitPayment = otherDiscountPayments.find(p => {
                const testValue = p.coupon_amount + used;
                return lodash.inRange(testValue, maximum * (1 - delta), maximum + 1);
            })
            if (fitPayment) {
                hxDiscountPayments.unshift(fitPayment);
                used += fitPayment.coupon_amount;
            }
        }
        let results = {total_amount: amount, maximum: maximum, used: roundToTwo(used)}
        const data = {
            results: results,
            purchases: hxDiscountPayments,
        };
        response.status(200).send(data);
    } catch (err) {
        const statusCode = err.statusCode != null ? err.statusCode : 500
        response.status(statusCode).send({statusCode: statusCode, error: err.message});
    }
});

class AppError extends Error {
    constructor(statusCode, message){
        super(message);
        this.statusCode = statusCode;
    }
}

const roundToTwo = num => +(Math.round(num + "e+2")  + "e-2");

const getProcessedPayments = ({results}) => {
    return results.map(result => {
        const discount = result.coupon_amount === 0 ? 0 : result.coupon_amount / result.transaction_amount;
        const month = moment(result.date_approved).month();
        const payment = {
            id: result.id,
            description: result.description,
            date_approved: result.date_approved,
            transaction_amount: result.transaction_amount,
            coupon_amount: result.coupon_amount,
            discount: roundToTwo(discount),
            month: month,
        }
        return payment;
    });
}

const getLastPayments = async (offset, ACCESS_TOKEN) => {
    const response = await fetch(`${BASE_URL}${offset}`, {
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: ACCESS_TOKEN,
          },
    });
    const data = await response.json();
    return data;
}

