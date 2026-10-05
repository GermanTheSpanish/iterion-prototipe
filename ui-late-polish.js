(function(root){
  'use strict';
  const doc=root.document;
  if(!doc||root.__monoidLatePolishInstalled)return;
  root.__monoidLatePolishInstalled=true;

  const BUILD_ID='20261005.5',EXTREME_THRESHOLD=1e27,MAX_MARKET_TILES=3,MG=root.MonoidModGuidance;
  const $=id=>doc.getElementById(id);
  const OFFER_COPY={};


  const style=doc.createElement('style');
  style.id='monoid-late-polish';
  style.textContent=`
    /* Header: MONOID is centred against the phone, not against its neighbours. */
    .gameHeader{position:relative!important;justify-content:flex-end!important}
    .wordmark{position:absolute!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;width:clamp(108px,29.3vw,126px)!important;display:flex!important;align-items:center!important;justify-content:space-between!important;font-size:14px!important;font-weight:780!important;letter-spacing:0!important;white-space:nowrap!important;pointer-events:none}
    .wordmark>span{display:block;line-height:1}
    .headerActions{position:relative!important;z-index:2!important}
    .gameHeader .helpButton,#menuButton{min-width:44px!important;height:44px!important;min-height:44px!important}

    /* Physical tile modifiers: the code wins over pips and reads at board distance. */
    .app .tileModMark{font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",Arial,sans-serif!important;font-weight:950!important;line-height:.78!important;letter-spacing:-.06em!important;color:rgba(17,17,17,.94)!important;text-shadow:0 0 1px rgba(255,255,255,.78)!important}
    .app .piece>.tileModMark{font-size:clamp(12px,3.4vw,15px)!important}
    .app .domino>.tileModMark{font-size:20px!important}
    .app .piece:has(>.tileModMark) .pips,.app .domino:has(>.tileModMark) .spips{opacity:.28}
    .app .circuitTile>.tileModMark{color:var(--circuit-pip,#fff)!important;text-shadow:none!important}
    .app .piece.modFaceRevealed{animation:modFaceReveal .24s cubic-bezier(.2,.75,.25,1);backface-visibility:hidden;transform-style:preserve-3d}
    @keyframes modFaceReveal{0%{transform:rotateY(90deg)}100%{transform:rotateY(0)}}
    @media(prefers-reduced-motion:reduce){.app .piece.modFaceRevealed{animation:none!important}}
    .modifierTutorGameTile .domino>.tileModMark{font-size:23px!important;font-weight:950!important;color:rgba(17,17,17,.96)!important}

    /* Hand overflow: preserve every purchased physical tile on compact horizontal rails.
       Vertical right-hand layouts keep their existing stack. */
    .handRail{container-type:inline-size}
    @container (min-width:180px){
      .bottomBar .hand.handOverflow{display:grid!important;align-content:center!important;justify-content:stretch!important;gap:2px!important;width:100%!important}
      .bottomBar .hand.handOverflow[data-hand-count="6"]{grid-template-columns:repeat(6,minmax(0,1fr))!important;grid-template-rows:44px!important}
      .bottomBar .hand.handOverflow[data-hand-count="7"],.bottomBar .hand.handOverflow[data-hand-count="8"]{grid-template-columns:repeat(4,minmax(44px,1fr))!important;grid-auto-rows:44px!important}
      .bottomBar .hand.handOverflow .handSlot{box-sizing:border-box!important;width:auto!important;min-width:0!important;max-width:none!important;height:44px!important;min-height:44px!important;flex:none!important;align-items:center!important;justify-content:center!important}
      .bottomBar .hand.handOverflow .tile{box-sizing:border-box!important;width:100%!important;min-width:0!important;max-width:none!important;height:44px!important;min-height:44px!important;max-height:44px!important;display:flex!important;align-items:center!important;justify-content:center!important}
      .bottomBar .hand.handOverflow[data-hand-count="6"] .tile{min-width:38px!important}
      .bottomBar .hand.handOverflow[data-hand-count="7"] .tile,.bottomBar .hand.handOverflow[data-hand-count="8"] .tile{min-width:44px!important}
    }

    /* Compact commerce previews: equal halves, centred values, secondary seam code.
       Board/hand miniatures do not opt into this mode. Keep material and tier edges. */
    .domino.compactPreview{height:62px}
    .domino.compactPreview>.half{width:100%!important;min-width:0!important;height:auto!important;max-height:none!important;min-height:0;flex:1 1 0!important}
    .domino.compactPreview>.half>.spips{inset:16%!important;opacity:1!important;transform:none!important}
    .domino.compactPreview>.tileModMark{inset:auto!important;left:50%!important;top:50%!important;transform:translate(-50%,-50%)!important;display:flex!important;align-items:center;justify-content:center;gap:0;padding:0 1px!important;height:10px;white-space:nowrap;font-size:9px!important;font-weight:800!important;line-height:1!important;letter-spacing:0!important;font-style:normal;color:rgba(17,17,17,.96)!important;background:inherit!important;text-shadow:none!important}
    .domino.compactPreview.powerTile:not(.circuitTile)>.tileModMark{background:var(--power-pale)!important}
    .domino.compactPreview.circuitTile>.tileModMark{color:var(--circuit-pip,#fff)!important}

    /* Long Chain is a machine state: one quiet horizontal instrument above the board. */
    .boardTop:has(.machineModStatus:not([hidden])){display:flex!important;justify-content:center!important}
    .machineModStatus{width:min(180px,62%)!important;color:var(--ink)!important;text-align:center!important}
    .machineModStatus>span{font-size:9px!important;font-weight:850!important;line-height:1!important;letter-spacing:.16em!important}
    .machineModStatus>i{height:3px!important;margin-top:4px!important;background:var(--line)!important}

    /* Extreme Endless values remain readable and never ellipsise. */
    .scoreValue.extremeValue{font-size:clamp(28px,8.8vw,46px)!important;letter-spacing:-.045em!important;overflow:visible!important;text-overflow:clip!important}
    .finalfx{max-width:calc(100% - 16px)!important;min-width:0!important;padding:6px 9px!important;border:1px solid var(--line)!important;background:var(--paper)!important;color:var(--ink)!important;box-shadow:none!important;text-shadow:none!important;overflow:visible!important}
    .finalfx>span{display:block;max-width:100%;white-space:nowrap}

    /* Market: one authoritative three-band row for BUY and REASSIGN states. */
    .commerceModal .marketAssignments{display:none!important}
    .commerceModal .marketChoiceTitle{margin:10px 0 2px!important}
    .commerceModal .marketOfferGrid{display:block!important}
    .commerceModal .marketOffer.marketStructuredOffer{display:flex!important;flex-direction:column!important;gap:0!important;padding:12px 0!important;border:0!important;border-bottom:1px solid var(--line)!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;opacity:1!important;min-width:0!important}
    .commerceModal .marketStructuredOffer>.marketOfferHead{display:flex!important;align-items:baseline!important;justify-content:space-between!important;gap:10px!important;width:100%!important}
    .commerceModal .marketStructuredOffer>.marketOfferHead strong{font-size:15px!important;line-height:1.12!important;letter-spacing:.035em!important}
    .commerceModal .marketStructuredOffer>.marketOfferHead span{font-size:16px!important;line-height:1!important;font-variant-numeric:tabular-nums!important;white-space:nowrap!important}
    .commerceModal .marketOfferDescription{width:100%!important;margin:6px 0 2px!important;font-size:13px!important;line-height:1.3!important;color:var(--muted)!important;display:block!important;overflow:visible!important}
    .commerceModal .marketModDiagram{width:100%;min-height:40px;margin:0 0 6px;overflow:hidden}.commerceModal .marketModDiagram .modDiagram{pointer-events:none}
    .commerceModal .marketContextRow{display:grid!important;grid-template-columns:minmax(0,1fr) 112px!important;gap:10px!important;align-items:end!important;min-width:0!important}
    .commerceModal .marketPhysicalContext{display:flex!important;align-items:flex-end!important;gap:12px!important;min-width:0!important;overflow:hidden!important}
    .commerceModal .marketContextGroup{display:flex!important;flex-direction:column!important;gap:5px!important;min-width:0!important}
    .commerceModal .marketAssignedGroup{flex:0 0 auto!important}
    .commerceModal .marketPoolGroup{flex:1 1 auto!important}
    .commerceModal .marketContextLabel{font-size:10px!important;line-height:1!important;font-weight:750!important;letter-spacing:.11em!important;color:var(--muted)!important;white-space:nowrap!important}
    .commerceModal .marketContextTiles{display:flex!important;align-items:center!important;gap:5px!important;min-width:0!important}
    .commerceModal .marketContextTiles .marketTileList{display:flex!important;align-items:center!important;gap:5px!important;max-width:100%!important;margin:0!important;padding:0!important;overflow:visible!important;overscroll-behavior:auto!important}
    .commerceModal .marketContextTiles .marketTile{min-width:0!important;padding:0!important;background:transparent!important;gap:0!important}
    .commerceModal .marketContextTiles .marketTile small{display:none!important}
    .commerceModal .marketContextTiles .marketTile .domino{width:26px!important;height:50px!important}
    .commerceModal .marketContextTiles .marketTileOverflow{display:none!important}
    .commerceModal .marketTileMore{align-self:center;color:var(--muted);font-size:10px;font-weight:800;line-height:1;white-space:nowrap}
    .commerceModal .marketMachineTag{display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;gap:4px!important;min-height:50px!important;color:var(--muted)!important}
    .commerceModal .marketMachineTag strong{font-size:11px!important;font-weight:850!important;letter-spacing:.14em!important}
    .commerceModal .marketMachineTag small{font-size:9px!important;line-height:1.15!important;letter-spacing:.05em!important}
    .commerceModal .marketOfferAction{display:flex!important;flex-direction:column!important;align-items:stretch!important;justify-content:flex-end!important;gap:4px!important;width:112px!important}
    .commerceModal .marketOfferAction .shopBuy{width:112px!important;min-height:44px!important;margin:0!important;padding:7px 8px!important;border:1px solid var(--line)!important;border-radius:3px!important;background:transparent!important;color:var(--ink)!important;font-size:11px!important;box-shadow:none!important}
    .commerceModal .marketOfferAction .shopBuy:disabled{opacity:.46!important;background:transparent!important;color:var(--ink)!important}
    .commerceModal .marketActionReason{font-size:9px;line-height:1.1;color:var(--muted);text-align:center}
    .commerceModal .shopSupply{font-size:10px!important;line-height:1.25!important;letter-spacing:.07em!important}
    .commerceModal .shopFoot{margin-top:8px!important;font-size:10px!important;line-height:1.3!important;color:var(--muted)!important}
    body.endlessPalette .commerceModal .marketOffer.marketStructuredOffer{background:transparent!important;border-color:var(--line)!important}
    body.endlessPalette .commerceModal .marketOfferAction .shopBuy{border-color:var(--line)!important;background:transparent!important;color:var(--ink)!important}
    .wildPip,.swildPip{position:absolute;left:50%;top:50%;transform:translate(-50%,-52%);font:900 16px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--ink)}
    .swildPip{font-size:13px}
    .specialTileMark{position:absolute;left:50%;top:50%;z-index:10;transform:translate(-50%,-50%);padding:1px 2px;background:inherit;color:var(--ink);font:850 7px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.04em;pointer-events:none}
    .piece>.specialTileMark{font-size:6px}
    .compactCommerceModal .bigShop{display:grid;gap:10px}
    .compactCommerceModal .shopHero{margin:0!important;padding:0 0 8px!important}
    .compactCommerceModal .shopOfferGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    .compactCommerceModal .shopTileOfferGrid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important}
    .compactCommerceModal .shopCompactOffer{display:grid!important;grid-template-columns:1fr!important;grid-template-rows:auto auto auto auto;align-items:center;justify-items:center;gap:5px;min-width:0;padding:8px 5px!important;border:1px solid var(--line)!important;border-radius:4px!important;background:transparent!important}
    .compactCommerceModal .shopCompactOffer>strong{font-size:10px;line-height:1;letter-spacing:.05em}
    .compactCommerceModal .shopCompactOffer>small{font-size:8px;line-height:1;color:var(--muted);text-align:center}
    /* Tile Shop physical pieces inherit the Hand geometry exactly: 40px body, 38px halves.
       Board pieces stay grid-owned; only presentation miniatures are normalised here. */
    .compactCommerceModal .shopOfferInspect{appearance:none;border:0;background:transparent;color:inherit;padding:0;min-width:44px;min-height:68px;display:grid;place-items:center}
    .compactCommerceModal .shopOfferInspect .marketTile{display:grid;place-items:center;min-width:0;padding:0!important;background:transparent!important;gap:0!important;transform:none!important;transform-origin:center!important;margin-right:0!important}
    .compactCommerceModal .shopOfferInspect .marketTile small{display:none!important}
    .compactCommerceModal .shopOfferInspect .domino.compactPreview{width:30px!important;height:auto!important;max-width:100%!important;max-height:none!important;aspect-ratio:1/2!important;box-sizing:border-box!important;margin:auto!important}
    .compactCommerceModal .shopOfferInspect .domino.compactPreview>.half{width:100%!important;height:50%!important;min-height:0!important;max-height:none!important;flex:1 1 50%!important;box-sizing:border-box!important}
    .compactCommerceModal .shopCompactOffer .shopBuy{width:100%!important;min-width:0!important;min-height:38px!important;padding:5px 3px!important;font-size:9px!important}
    .compactCommerceModal .exactShopOffer{grid-template-rows:68px 38px!important;gap:7px;padding:7px 4px!important}
    .compactCommerceModal .exactShopOffer>strong,.compactCommerceModal .exactShopOffer>small{display:none!important}
    .compactCommerceModal .adapterShopOffer.isUsed{opacity:.5}
    .compactCommerceModal .marketOfferGrid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px!important}
    .compactCommerceModal .marketOffer.marketCompactOffer{display:grid!important;grid-template-rows:minmax(88px,1fr) 44px;gap:8px!important;padding:10px!important;border:1px solid var(--line)!important;border-radius:4px!important;background:transparent!important;min-width:0!important}
    .compactCommerceModal .marketOfferIdentity{appearance:none;border:0;background:transparent;color:inherit;padding:4px 2px;width:100%;min-width:0;display:grid;grid-template-rows:minmax(38px,auto) 42px;align-content:center;justify-items:center;gap:8px;text-align:center}
    .compactCommerceModal .marketOfferName{display:flex;align-items:center;justify-content:center;width:100%;min-width:0;font-size:16px!important;line-height:1.02!important;letter-spacing:.025em;text-align:center;text-wrap:balance;overflow-wrap:anywhere}
    .compactCommerceModal .marketOfferMark{display:grid;place-items:center;box-sizing:border-box;font-size:15px!important;line-height:1!important;font-weight:850;letter-spacing:.04em}
    .compactCommerceModal .marketTileModMark{width:64px;min-width:64px;height:32px;padding:0 8px;border:1.5px solid #171715;border-radius:4px;background:linear-gradient(to right,#171715 0,#171715 calc(50% - .5px),#56534e calc(50% - .5px),#56534e calc(50% + .5px),#171715 calc(50% + .5px),#171715 100%);color:#f8f5ed;box-shadow:0 2px 4px rgba(17,17,15,.12)}
    .compactCommerceModal .marketMachineModMark{width:44px;min-width:44px;height:36px;padding:0;border:1.5px solid currentColor;border-radius:4px;background:transparent;color:inherit}
    .compactCommerceModal .marketOfferSignalMark{display:grid;place-items:center;width:64px;height:36px}
    .marketSignalBolt{display:block;width:22px;height:34px;flex:none;background:#68655f;clip-path:polygon(58% 0,18% 55%,48% 55%,35% 100%,84% 40%,55% 40%);-webkit-clip-path:polygon(58% 0,18% 55%,48% 55%,35% 100%,84% 40%,55% 40%)}
    .compactCommerceModal .marketCompactOffer>.shopBuy{width:100%!important;min-height:44px!important;margin:0!important;padding:7px!important;font-size:10px!important;letter-spacing:.03em}
    .compactCommerceModal .marketCompactOffer>.shopBuy:disabled{opacity:.45}
    .compactCommerceModal .marketChoiceTitle{margin:2px 0!important;font-size:9px!important;letter-spacing:.12em!important}
    .compactCommerceModal .shopFoot{margin-top:0!important;padding-top:4px;font-size:8px!important;line-height:1.2!important;letter-spacing:.05em}

    .marketInspectorHero{align-items:center!important}.marketInspectorCode{font-size:18px!important;letter-spacing:.05em}.marketInspectorHero .marketTileModMark{width:72px;min-width:72px;height:36px;font-size:16px!important}.marketInspectorHero .marketMachineModMark{width:48px;min-width:48px;height:40px;font-size:16px!important}.marketInspectorSignalMark{display:grid;place-items:center;width:54px;height:44px}.marketInspectorSignalMark .marketSignalBolt{width:24px;height:38px}
    .marketInspectorDemoSection{overflow:hidden}.marketInspectorDemo{display:grid;place-items:center;min-height:104px;overflow:hidden}.marketInspectorDemo>.modDiagram{width:100%;height:94px!important;margin:0!important;border:0!important}
    .marketInspectorSignalDemo{grid-template-columns:auto 32px auto;gap:10px;font-size:22px;font-weight:850}.marketInspectorSignalDemo i{font-style:normal;color:var(--muted)}
    .marketInspectorDemo .modCore,.marketInspectorDemo .modDiagramLine>b,.marketInspectorSignalDemo>b{animation:marketInspectorPulse 2.4s ease-in-out infinite}
    .marketInspectorDemo .modNode,.marketInspectorDemo .modDiagramLine>i,.marketInspectorSignalDemo>i{animation:marketInspectorTrace 2.4s ease-in-out infinite}
    .marketInspectorDemo .modNode.e,.marketInspectorDemo .modDiagramLine>b:last-child,.marketInspectorSignalDemo>b:last-child{animation-delay:.8s}
    .marketInspectorDemo .modNode.s{animation-delay:1s}.marketInspectorDemo .modNode.w{animation-delay:1.2s}.marketInspectorDemo .modNode.n{animation-delay:.6s}
    .marketInspectorDemo.hasScene{min-height:132px;width:100%}.modExample{display:grid;width:100%;gap:5px}.modExampleBoard{position:relative;width:100%;height:108px;overflow:hidden;border-top:1px solid var(--line);border-bottom:1px solid var(--line);background:linear-gradient(to right,transparent 49.7%,rgba(17,17,17,.025) 50%,transparent 50.3%),linear-gradient(to bottom,transparent 49.5%,rgba(17,17,17,.025) 50%,transparent 50.5%)}
    .modExampleBoard>svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.modExampleRoute,.modExamplePortal,.modExampleArc{fill:none;stroke:currentColor;stroke-width:1.2;vector-effect:non-scaling-stroke;stroke-linecap:round}.modExampleRoute{path-length:1;stroke-dasharray:1;stroke-dashoffset:1;animation:modExampleDraw 3s ease-in-out infinite}.modExampleRoute.branch{animation-delay:.7s}.modExamplePortal{stroke-dasharray:2.5 3.5;opacity:.42;animation:modExamplePortal 3s ease-in-out infinite}.modExampleArc{stroke-dasharray:2 2;opacity:.45;animation:modExampleArc 3s ease-in-out infinite}
    .modExampleTile{position:absolute;left:calc(var(--x)*1%);top:calc(var(--y)*1.666666%);display:flex;width:40px;height:20px;transform:translate(-50%,-50%);border:1px solid currentColor;border-radius:3px;background:var(--paper);overflow:hidden;font:800 9px/1 ui-monospace,SFMono-Regular,Menlo,monospace;z-index:2}.modExampleTile.v{width:20px;height:40px;flex-direction:column}.modExampleTile>i{position:relative;display:grid;place-items:center;flex:1;font-style:normal}.modExampleTile.h>i+i{border-left:1px solid currentColor}.modExampleTile.v>i+i{border-top:1px solid currentColor}.modExampleTile>b{position:absolute;inset:0;display:grid;place-items:center;background:rgba(248,245,237,.88);font-size:10px;letter-spacing:-.03em}.modExampleTile.mod{border-width:1.5px}.modExampleTile.ghost{opacity:.18;animation:modExampleGhost 3s ease-in-out infinite}.modExample.dense .modExampleTile{width:32px;height:16px;font-size:7px}.modExample.dense .modExampleTile.v{width:16px;height:32px}
    .modExampleOutcome{position:absolute;right:5px;bottom:5px;z-index:3;padding:4px 6px;border:1px solid currentColor;border-radius:3px;background:var(--paper);font-size:8px;line-height:1;letter-spacing:.06em;animation:modExampleOutcome 3s ease-in-out infinite}.modExampleCaption{display:block;text-align:center;font-size:7px;line-height:1.2;letter-spacing:.1em;color:var(--muted)}
    @keyframes marketInspectorPulse{0%,20%,100%{opacity:.35;transform:scale(.96)}45%,70%{opacity:1;transform:scale(1.04)}}
    @keyframes marketInspectorTrace{0%,18%,100%{opacity:.22}42%,72%{opacity:1}}
    @keyframes modExampleDraw{0%,12%{stroke-dashoffset:1;opacity:.25}55%,82%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:.25}}
    @keyframes modExamplePortal{0%,25%,100%{opacity:.12}48%,76%{opacity:.8}}
    @keyframes modExampleArc{0%,20%,100%{stroke-dashoffset:0;opacity:.18}50%,75%{stroke-dashoffset:4;opacity:.8}}
    @keyframes modExampleGhost{0%,20%,100%{opacity:.08}58%,82%{opacity:.46}}
    @keyframes modExampleOutcome{0%,46%,100%{opacity:.18;transform:translateY(3px)}62%,88%{opacity:1;transform:translateY(0)}}
    @media(prefers-reduced-motion:reduce){.marketInspectorDemo *{animation:none!important}.marketInspectorDemo .modCore,.marketInspectorDemo .modNode,.marketInspectorDemo .modDiagramLine>*,.marketInspectorSignalDemo>*,.modExampleRoute,.modExamplePortal,.modExampleArc,.modExampleTile,.modExampleOutcome{opacity:1!important;transform:none!important}.modExampleTile{transform:translate(-50%,-50%)!important}}

    #progressionRewardDialog{width:min(390px,calc(100vw - 24px));max-width:none;margin:auto;padding:0;border:1px solid var(--ink);border-radius:5px;background:var(--paper);color:var(--ink);box-shadow:none}
    #progressionRewardDialog::backdrop{background:rgba(10,10,9,.82)}
    .progressionRewardCard{display:grid;justify-items:center;gap:12px;padding:28px 24px 22px;text-align:center}
    .progressionRewardEyebrow{font-size:10px;font-weight:850;line-height:1;letter-spacing:.22em;color:var(--muted)}
    .progressionRewardCard h2{margin:0!important;font-size:clamp(30px,10vw,42px)!important;font-weight:760!important;line-height:.95!important;letter-spacing:.035em!important}
    .progressionRewardVisual{display:grid;place-items:center;width:100%;height:126px;margin:4px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);overflow:hidden}
    .progressionRewardVisual>.modDiagram{width:100%;height:108px!important;margin:0!important;border:0!important}
    .progressionRewardDomino{display:flex;flex-direction:column;width:56px;height:108px;border:2px solid currentColor;border-radius:7px;background:var(--paper);box-shadow:2px 4px 10px rgba(0,0,0,.08)}
    .progressionRewardDomino>span{position:relative;flex:1}.progressionRewardDomino>span+span{border-top:2px solid currentColor}.progressionRewardDomino em{position:absolute;inset:13%;font-style:normal}
    .progressionRewardDomino i{position:absolute;width:6px;height:6px;border-radius:50%;background:currentColor;transform:translate(-50%,-50%)}
    .progressionRewardRule{max-width:300px;font-size:15px;line-height:1.25;font-weight:760}
    .progressionRewardMeta{margin:0!important;max-width:310px;font-size:10px!important;line-height:1.35!important;font-weight:700;letter-spacing:.1em;color:var(--muted)!important}
    .progressionRewardContinue{width:100%;min-height:52px;margin-top:4px;border:1px solid var(--ink);border-radius:3px;background:var(--ink);color:var(--paper);font-size:13px;font-weight:800;letter-spacing:.12em}
    @media(max-height:700px){.progressionRewardCard{gap:8px;padding:20px 18px 16px}.progressionRewardVisual{height:92px}.progressionRewardVisual>.modDiagram{height:82px!important}.progressionRewardDomino{width:42px;height:82px}.progressionRewardDomino i{width:5px;height:5px}.progressionRewardCard h2{font-size:29px!important}.progressionRewardContinue{min-height:48px}}
    @media(prefers-reduced-motion:reduce){#progressionRewardDialog{scroll-behavior:auto}}
    @media(max-width:390px),(max-height:700px){
      .wordmark{width:clamp(104px,28vw,120px)!important;font-size:13px!important}
      .app .piece>.tileModMark{font-size:12px!important}.app .domino>.tileModMark{font-size:17px!important}
      .machineModStatus{width:min(160px,58%)!important}.machineModStatus>span{font-size:8px!important}
      .commerceModal .marketOffer.marketStructuredOffer{padding:8px!important}
      .compactCommerceModal .marketOfferName{font-size:15px!important}
      .compactCommerceModal .marketTileModMark{width:58px;min-width:58px;height:30px;font-size:14px!important}.compactCommerceModal .marketMachineModMark{width:40px;min-width:40px;height:34px;font-size:14px!important}.compactCommerceModal .marketOfferSignalMark{width:58px;height:34px}.compactCommerceModal .marketOfferSignalMark .marketSignalBolt{width:20px;height:31px}
      .commerceModal .marketOfferDescription{font-size:12px!important;line-height:1.26!important;margin:5px 0 8px!important}
      .commerceModal .marketContextRow{grid-template-columns:minmax(0,1fr) 106px!important;gap:8px!important}
      .commerceModal .marketPhysicalContext{gap:9px!important}
      .commerceModal .marketContextTiles .marketTile .domino{width:24px!important;height:46px!important}
      .commerceModal .marketOfferAction,.commerceModal .marketOfferAction .shopBuy{width:106px!important}
      .compactCommerceModal .shopOfferInspect{min-height:60px}
      .compactCommerceModal .shopOfferInspect .domino.compactPreview{width:26px!important}
      .compactCommerceModal .exactShopOffer{grid-template-rows:60px 38px!important}
    }
  `;
  doc.head.appendChild(style);

  const REWARD_MODES=Object.freeze({
    classic:{name:'CLASSIC',pips:0,description:'Classic → Endless → Infinite'},
    eyes:{name:'THE EYES',pips:1,description:'1|1 · Signal 6'},
    frames:{name:'THE FRAMES',pips:2,description:'2|2 · Signal 4'},
    river:{name:'THE RIVER',pips:3,description:'3|3 · Signal 3'},
    loom:{name:'THE LOOM',pips:4,description:'4|4 · Signal 2'},
    peaks:{name:'THE PEAKS',pips:5,description:'5|5 · Signal 2'},
    islands:{name:'THE ISLANDS',pips:6,description:'6|6 · Build from Cores'}
  });
  const REWARD_PIPS={0:[],1:[[50,50]],2:[[28,28],[72,72]],3:[[28,28],[50,50],[72,72]],4:[[28,28],[72,28],[28,72],[72,72]],5:[[28,28],[72,28],[50,50],[28,72],[72,72]],6:[[28,23],[72,23],[28,50],[72,50],[28,77],[72,77]]};
  const rewardQueue=[];
  let rewardDialog=null,rewardActive=false,rewardReturnFocus=null;
  const rewardPips=value=>(REWARD_PIPS[value]||[]).map(([x,y])=>`<i style="left:${x}%;top:${y}%"></i>`).join('');
  function modeRewardVisual(mode){const spec=REWARD_MODES[mode]||REWARD_MODES.classic,p=rewardPips(spec.pips);return `<div class="progressionRewardDomino" aria-hidden="true"><span><em>${p}</em></span><span><em>${p}</em></span></div>`}
  function ensureRewardDialog(){
    if(rewardDialog)return rewardDialog;
    rewardDialog=doc.createElement('dialog');rewardDialog.id='progressionRewardDialog';rewardDialog.setAttribute('aria-labelledby','progressionRewardTitle');rewardDialog.innerHTML='<article class="progressionRewardCard"><div class="progressionRewardEyebrow"></div><h2 id="progressionRewardTitle"></h2><div class="progressionRewardVisual"></div><strong class="progressionRewardRule"></strong><p class="progressionRewardMeta"></p><button type="button" class="progressionRewardContinue">CONTINUE</button></article>';doc.body.appendChild(rewardDialog);
    rewardDialog.querySelector('.progressionRewardContinue').addEventListener('click',()=>rewardDialog.close());
    rewardDialog.addEventListener('close',()=>{rewardActive=false;const target=rewardReturnFocus;rewardReturnFocus=null;if(target?.isConnected)target.focus();showNextReward()});
    return rewardDialog
  }
  function modeRewardItems(detail){
    const unlocked=Array.isArray(detail?.unlockedModes)?detail.unlockedModes:[],completed=Array.isArray(detail?.completedModes)?detail.completedModes:[],completedName=completed.length?(REWARD_MODES[completed.at(-1)]?.name||String(completed.at(-1)).toUpperCase()):null;
    if(unlocked.length)return unlocked.map(mode=>({kind:'mode',mode,completedName}));
    if(completed.length){const mode=completed.at(-1);return[{kind:'completion',mode,completedName:null}]}
    return[]
  }
  function progressionRewardSurfaceReady(){
    const overlay=$('overlay'),menu=$('gameMenu'),entry=$('entryFlow');
    if(entry&&!entry.hidden)return false;
    if(overlay?.classList.contains('show')||menu?.open)return false;
    return !doc.querySelector('dialog[open]:not(#progressionRewardDialog)')
  }
  function enqueueProgressionReward(detail){rewardQueue.push(...modeRewardItems(detail));showNextReward()}
  function enqueueModReward(id){const mod=root.IterionMods?.get?.(id),guide=MG?.get?.(id);if(!mod)return;rewardQueue.push({kind:'mod',id,mod,guide});showNextReward()}
  function showNextReward(){
    if(rewardActive||!rewardQueue.length||!progressionRewardSurfaceReady())return;const item=rewardQueue.shift(),dialog=ensureRewardDialog(),eyebrow=dialog.querySelector('.progressionRewardEyebrow'),title=dialog.querySelector('#progressionRewardTitle'),visual=dialog.querySelector('.progressionRewardVisual'),rule=dialog.querySelector('.progressionRewardRule'),meta=dialog.querySelector('.progressionRewardMeta');
    rewardReturnFocus=doc.activeElement;rewardActive=true;
    if(item.kind==='mod'){
      eyebrow.textContent='NEW MOD DISCOVERED';title.textContent=item.mod.displayName||item.mod.name||item.id.toUpperCase();visual.innerHTML=MG?.diagramHtml?.(item.id,false)||`<div class="modDiagram modDiagramLine"><b>${item.mod.collectionCode||item.id.slice(0,2).toUpperCase()}</b></div>`;rule.textContent=item.guide?.market||item.mod.shortDescription||'';meta.textContent='ADDED TO MOD COLLECTION';
    }else{
      const spec=REWARD_MODES[item.mode]||{name:String(item.mode||'MODE').toUpperCase(),pips:0,description:''};eyebrow.textContent=item.kind==='completion'?'MODE COMPLETE':'NEW MODE UNLOCKED';title.textContent=spec.name;visual.innerHTML=modeRewardVisual(item.mode);rule.textContent=spec.description;meta.textContent=item.kind==='completion'?'MILESTONE COMPLETE':item.completedName?`${item.completedName} COMPLETE · AVAILABLE FROM GAME SELECTION`:'AVAILABLE FROM GAME SELECTION';
    }
    if(!dialog.open)dialog.showModal();dialog.querySelector('.progressionRewardContinue').focus()
  }
  root.addEventListener('monoid:mod-unlocked',event=>enqueueModReward(event.detail?.id));
  const pendingRewards=Array.isArray(root.__monoidProgressionRewardQueue)?root.__monoidProgressionRewardQueue.splice(0):[];for(const reward of pendingRewards)enqueueProgressionReward(reward);

  function decorateWordmark(){
    const wordmark=doc.querySelector('.wordmark');if(!wordmark)return;
    const spans=[...wordmark.children],letters=spans.map(span=>span.textContent||'').join('');
    const intact=spans.length===6&&spans.every(span=>span.tagName==='SPAN')&&letters==='MONOID';
    if(!intact){wordmark.dataset.letterized='true';if(!wordmark.getAttribute('aria-label'))wordmark.setAttribute('aria-label','MONOID');wordmark.innerHTML='MONOID'.split('').map(c=>`<span aria-hidden="true">${c}</span>`).join('')}
  }
  function scientific(value){
    value=Number(value);if(!Number.isFinite(value))return String(value);
    return value.toExponential(2).replace(/\.00e/,'e').replace(/(\.\d)0e/,'$1e').replace('e+','e')
  }
  function displayValue(value){value=Number(value);return Number.isFinite(value)&&Math.abs(value)>=EXTREME_THRESHOLD?scientific(value):root.IterionPresentation?.compact?.(value)??String(value)}
  function syncExtremeNumbers(){
    const game=root.__monoidGame;if(!game?.state)return;const s=game.state(),pairs=[[ $('score'),s.score],[ $('target'),game.target?.() ]];
    for(const[el,value]of pairs){if(!el||!Number.isFinite(Number(value)))continue;const extreme=Math.abs(Number(value))>=EXTREME_THRESHOLD;el.classList.toggle('extremeValue',extreme);if(extreme){const text=scientific(value);if(el.textContent!==text)el.textContent=text}}
    const final=doc.querySelector('.finalfx>span');if(final&&Math.abs(Number(s.score))>=EXTREME_THRESHOLD){const text=scientific(s.score);if(final.textContent!==text)final.textContent=text}
  }
  const OFFER_LABELS=Object.freeze({'double-double':'DD','double-echo':'DE','zero-port':'ZP','parity-exchange':'PX','corner':'CR','long-line':'LN','overload':'OV','terminal':'TE','diode':'DI','return':'RT','twin':'TW','pair':'PR','bridge':'BR','gate':'GT','fan':'FN','frame':'FM','crown':'CW','frontier':'FT','merge':'MG','hinge':'HG','resonator':'RS','forge':'FG','foundation':'FD','knot':'KN','mirror':'MR','mint':'MT'});
  const offerLabel=id=>OFFER_LABELS[id]||null;
  function assignedTiles(){
    const map=new Map();
    doc.querySelectorAll('.marketAssignments .marketTile').forEach(tile=>{
      const label=tile.querySelector('small')?.textContent?.trim();if(!label)return;
      const list=map.get(label)||[];list.push(tile);map.set(label,list)
    });
    return map
  }
  function makeContextGroup(label,className){
    const group=doc.createElement('div');group.className=`marketContextGroup ${className}`;
    const title=doc.createElement('div');title.className='marketContextLabel';title.textContent=label;
    const tiles=doc.createElement('div');tiles.className='marketContextTiles';
    group.append(title,tiles);return{group,tiles}
  }
  function actionReason(offer,info,button){
    const game=root.__monoidGame,s=game?.state?.();if(!button?.disabled||!info||!s)return'';
    if(offer.classList.contains('purchasedOffer'))return'INSTALLED';
    if(offer.classList.contains('lockedOffer'))return'CHOICE USED';
    if(info.targetCount<1)return'NO VALID TARGET';
    if(Number(s.coins)<Number(info.price))return'NOT ENOUGH COINS';
    return''
  }
  function decorateMarket(){
    const overlay=$('overlay'),title=$('overlayTitle');if(!overlay?.classList.contains('show')||title?.textContent.trim()!=='MARKET')return;
    doc.querySelectorAll('.marketOffer[data-market-offer]').forEach(offer=>{offer.classList.add('marketStructuredOffer','marketCompactOffer');offer.classList.remove('marketPolishedOffer')})
  }
  function syncBuildStamp(){
    root.__MONOID_BUILD=BUILD_ID;const text=`v${root.IterionData?.VERSION||'dev'} · build ${BUILD_ID}`;for(const el of[$('devBuildStamp'),doc.querySelector('.menuBuildStamp')])if(el&&el.textContent!==text)el.textContent=text
  }
  let queued=false;
  function sync(){queued=false;decorateWordmark();decorateMarket();syncExtremeNumbers();syncBuildStamp();showNextReward()}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(sync)}
  new MutationObserver(schedule).observe(doc.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','aria-label','hidden','open']});
  root.addEventListener('resize',schedule);root.addEventListener('pageshow',schedule);
  root.MonoidLatePolish=Object.freeze({BUILD_ID,MAX_MARKET_TILES,EXTREME_THRESHOLD,scientific,displayValue,sync,enqueueProgressionReward,enqueueModReward});
  sync()
})(window);
