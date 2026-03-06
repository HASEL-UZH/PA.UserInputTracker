type UserInputAggregate = {
  tsStart: Date;
  tsEnd: Date;
  clickTotal: number;
  scrollDelta: number;
  movedDistance: number;

  keyTotal: number;
  keysTotal?: number;
  keysLetter?: number;
  keysNumber?: number;
  keysNavigate?: number;
  keysDelete?: number;
  keysModifier?: number;
  keysSpace?: number;
  keysTab?: number;
  keyEnter?: number;
  keysOther?: number;
};

export default UserInputAggregate;
