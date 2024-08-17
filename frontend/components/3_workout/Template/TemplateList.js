import React, { useCallback } from "react";
import DraggableFlatList from "react-native-draggable-flatlist";
import TemplateCard from "./TemplateCard";

const TemplateList = ({ templates, setTemplates, openEditTemplateBottomSheet, startWorkoutFromTemplate }) => {
    const renderItem = useCallback(({ item, drag }) => {
        const index = templates.findIndex(template => template.tid === item.tid);
        return (
            <TemplateCard
                template={item}
                handleLongPress={drag}
                handlePressEditButton={() => openEditTemplateBottomSheet(index)}
                handlePressStartButton={() => startWorkoutFromTemplate(index)}
                index={index}
            />
        );
    }, [openEditTemplateBottomSheet, templates]);

    return (
        <DraggableFlatList
            data={templates}
            onDragEnd={({ data }) => setTemplates(data)}
            keyExtractor={(item) => item.tid}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            style={{ height: 510 }}
        />
    );
};

export default TemplateList;
