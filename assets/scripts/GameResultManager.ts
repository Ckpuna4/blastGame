
import { _decorator, Component, game } from 'cc';
import { GameResult } from './enums/GameResult.enum';
const { ccclass } = _decorator;
 
@ccclass('GameResultManager')
export class GameResultManager extends Component {
    public gameResult?: GameResult;

    start() {
        game.addPersistRootNode(this.node);
    }
}
