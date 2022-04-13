
import { _decorator, Component, director, Node, LabelComponent, find, game } from 'cc';
import { GameResult } from './enums/GameResult.enum';
import { GameResultManager } from './GameResultManager';
const { ccclass, property } = _decorator;

@ccclass('EndGameManager')
export class EndGameManager extends Component {
    @property({type: Node})
    public endTitleNode: Node;

    start () {
        const gameResultManagerNode = find('gameResultManager');
        if (gameResultManagerNode) {
            const gameResultManager = gameResultManagerNode.getComponent(GameResultManager);
            const endTitle = gameResultManager.gameResult === GameResult.WIN
                ? 'Вы выиграли!'
                : 'Вы проиграли…';
            this.endTitleNode.getComponent(LabelComponent).string = endTitle;
            game.removePersistRootNode(gameResultManagerNode);
        }
    }

    public restartGame() {
        director.loadScene('main');
    }
}
