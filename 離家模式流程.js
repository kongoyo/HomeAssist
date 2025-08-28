if (msg.data.new_state.attributes['Operation Position'] === 1 && 
    msg.data.new_state.attributes['Operation Method'] === 9) {
  return msg;
} else {
  return null;
}