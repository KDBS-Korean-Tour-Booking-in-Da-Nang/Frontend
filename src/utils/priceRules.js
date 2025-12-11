// Price configuration for tour booking
export const PRICE = {
  ADULT: 1000000,  // 1,000,000 VND
  CHILD: 700000,   // 700,000 VND
  INFANT: 200000   // 200,000 VND
};

/**
 * Calculate total price based on number of passengers
 * @param {Object} pax - Passenger counts
 * @param {number} pax.adult - Number of adults
 * @param {number} pax.child - Number of children
 * @param {number} pax.infant - Number of infants
 * @returns {number} Total price in VND
 */
export const calcTotal = ({ adult, child, infant }) => {
  return adult * PRICE.ADULT + child * PRICE.CHILD + infant * PRICE.INFANT;
};

/**
 * Calculate individual price breakdown
 * @param {Object} pax - Passenger counts
 * @returns {Object} Price breakdown
 */
export const calcPriceBreakdown = ({ adult, child, infant }) => {
  return {
    adult: adult * PRICE.ADULT,
    child: child * PRICE.CHILD,
    infant: infant * PRICE.INFANT,
    total: calcTotal({ adult, child, infant })
  };
};

/**
 * Format price to Korean Won currency
 * @param {number} price - Price in VND
 * @returns {string} Formatted price string in KRW
 */
export const formatPrice = (price) => {
  const krwPrice = Math.round(price / 18);
  return krwPrice.toLocaleString('ko-KR') + ' KRW';
};
