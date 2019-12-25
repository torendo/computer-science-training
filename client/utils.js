export const getUniqueRandomArray = (length, max) => {
  const array = [];
  for (let i = 0; i < length; i++) {
    array.push(getUniqueRandomNumber(array, max));
  }
  return array;
};

export const getUniqueRandomNumber = (items, max) => {
  const num = Math.floor(Math.random() * max);
  return items.find(i => i === num) ? getUniqueRandomNumber(items, max) : num;
};

export const isPrime = (num) => {
  for (let i = 2, s = Math.sqrt(num); i <= s; i++)
    if (num % i === 0) return false;
  return num > 1;
};

export const colors100 = [
  '#FFCDD2',
  '#F8BBD0',
  '#E1BEE7',
  '#D1C4E9',
  '#C5CAE9',
  '#BBDEFB',
  '#B3E5FC',
  '#B2EBF2',
  '#B2DFDB',
  '#C8E6C9',
  '#DCEDC8',
  '#F0F4C3',
  '#FFF9C4',
  '#FFECB3',
  '#FFE0B2',
  '#FFCCBC',
  '#D7CCC8',
  '#CFD8DC',
  '#F5F5F5',
];

export const getColor100 = (i) => {
  return colors100[i % colors100.length];
};

export const getRandomColor100 = () => {
  return colors100[Math.floor(Math.random() * colors100.length)];
};

export const colors400 = [
  '#EF5350',
  '#EC407A',
  '#AB47BC',
  '#7E57C2',
  '#5C6BC0',
  '#42A5F5',
  '#29B6F6',
  '#26C6DA',
  '#26A69A',
  '#66BB6A',
  '#9CCC65',
  '#D4E157',
  '#FFEE58',
  '#FFCA28',
  '#FFA726',
  '#FF7043',
  '#8D6E63',
  '#78909C',
  '#BDBDBD',
];

export const getColor400 = (i) => {
  return colors400[i % colors400.length];
};

export const getRandomColor400 = () => {
  return colors400[Math.floor(Math.random() * colors400.length)];
};