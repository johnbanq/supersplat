# Segmentation Tool Design Doc V3

## Goal & Previous Attempt

I am trying to implement AI based segmentation into this tool, my previous attempts are documented in ./PLAN-v2.md & ./PLAN-v2-ai-opinion.md, and code is in branch feat/segmentation-proto-v2

## Initial Requirement


Based on Segmentation V2, I want to explore a different UX in V3:
* add a new AI segmentation tool in bottom tool bar
* when clicked, a mask overlay appears, the user can click prompt points to let AI 2D segment the current view, just like in V2
    * the 2D segmentation result is then used to calculate the segmentatio mask in 3D space, just as in V2
    * however, at the same time with overlay, a small panel on the side will appear, allowing user to clear all prompt points
* when user is happy with the mask, user can select in the side panel that the produced 3D mask should become the new selection (SET), or is OR/AND of existing selection.
* when user is happy with result, it can click apply in the side panel, and the selection is applied

* the selection changes should be integrated with undo

## Discusses Requirement