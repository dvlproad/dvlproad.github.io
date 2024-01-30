/*
 * @Author: dvlproad
 * @Date: 2023-03-03 13:59:55
 * @LastEditors: dvlproad
 * @LastEditTime: 2023-03-03 14:00:07
 * @Description: 
 */
function updateElementValueById(id, value) {
  if (typeof value == 'string') {
    // 
  } else {
    value = JSON.stringify(value);
  }

  document.getElementById(id).innerHTML = '' + `${value}`;
}

function getElementValueById(id) {
  return document.getElementById(id).value;
}
