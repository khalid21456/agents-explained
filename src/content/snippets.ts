export const LOOP = String.raw`
from langchain.agents import create_agent

agent = create_agent(
    model="anthropic:claude-sonnet-5-5",
    tools=[get_weather, calculator],
    system_prompt="You are a helpful assistant.",
)

result = agent.invoke({
    "messages": [("user", "What's the weather in Paris, in °F?")]
})
print(result["messages"][-1].content)
`

export const TOOLS = String.raw`
from langchain_core.tools import tool
from langchain.chat_models import init_chat_model

@tool
def get_weather(city: str) -> str:
    """Get the current weather for a city."""
    return weather_api.lookup(city)

model = init_chat_model("anthropic:claude-sonnet-5-5")
model_with_tools = model.bind_tools([get_weather, calculator])

response = model_with_tools.invoke("Weather in Tokyo?")
print(response.tool_calls)
`

export const MEMORY = String.raw`
from langchain.agents import create_agent
from langchain.embeddings import init_embeddings
from langchain_core.vectorstores import InMemoryVectorStore
from langgraph.checkpoint.memory import InMemorySaver

store = InMemoryVectorStore.from_texts(
    ["Vegetarian", "Booked Kyoto trip in May", "Listens to jazz"],
    embedding=init_embeddings("openai:text-embedding-3-small"),
)
docs = store.similarity_search("Plan dinner on my Kyoto trip", k=3)

agent = create_agent(model, tools, checkpointer=InMemorySaver())
config = {"configurable": {"thread_id": "user-42"}}
agent.invoke({"messages": [("user", "Remember I'm vegetarian")]}, config)
agent.invoke({"messages": [("user", "What should I eat tonight?")]}, config)
`

export const CHAIN_SIMPLE = String.raw`
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain.chat_models import init_chat_model

prompt = ChatPromptTemplate.from_messages([
    ("system", "You explain things in one sentence."),
    ("human", "What are {topic}?"),
])
model = init_chat_model("anthropic:claude-sonnet-5-5")
parser = StrOutputParser()

chain = prompt | model | parser
chain.invoke({"topic": "agents"})
`

export const CHAIN_RAG = String.raw`
from langchain_core.runnables import RunnablePassthrough

retriever = vector_store.as_retriever(search_kwargs={"k": 4})

prompt = ChatPromptTemplate.from_template(
    "Answer using only this context:\n{context}\n\nQuestion: {question}"
)

rag_chain = (
    {"context": retriever, "question": RunnablePassthrough()}
    | prompt
    | model
    | StrOutputParser()
)
rag_chain.invoke("What is LangGraph?")
`

export const GRAPH = String.raw`
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.checkpoint.memory import InMemorySaver

class State(TypedDict):
    messages: Annotated[list, add_messages]

def agent(state: State):
    return {"messages": [model_with_tools.invoke(state["messages"])]}

builder = StateGraph(State)
builder.add_node("agent", agent)
builder.add_node("tools", ToolNode([search_flights, get_weather]))
builder.add_edge(START, "agent")
builder.add_conditional_edges("agent", tools_condition)
builder.add_edge("tools", "agent")

graph = builder.compile(
    checkpointer=InMemorySaver(),
    interrupt_before=["tools"],
)

config = {"configurable": {"thread_id": "trip-1"}}
graph.invoke({"messages": [("user", "Find a flight to Kyoto...")]}, config)
graph.invoke(None, config)
`

export const MULTI = String.raw`
from typing import Literal
from langgraph.graph import StateGraph, START
from langgraph.types import Command

Route = Literal["researcher", "coder", "writer", "__end__"]

def supervisor(state: State) -> Command[Route]:
    decision = router.invoke(state["messages"])
    return Command(goto=decision.next)

def researcher(state: State) -> Command[Literal["supervisor"]]:
    result = research_agent.invoke(state)
    return Command(
        goto="supervisor",
        update={"messages": result["messages"][-1:]},
    )

builder = StateGraph(State)
builder.add_node(supervisor)
builder.add_node(researcher)
builder.add_node(coder)
builder.add_node(writer)
builder.add_edge(START, "supervisor")
graph = builder.compile()
`
