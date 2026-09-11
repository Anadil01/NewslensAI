function ForYou(){
   return (
  <div>
    <div>
      {/* FOR YOU */}
      <h1>For You</h1>
      <h2>Your briefing</h2>

      {/* tabs */}
      {/* signal chips */}
    </div>

    {/* stories */}
    {stories.map((story) => (
      <StoryCard
        key={story.id}
        story={story}
      />
    ))}
  </div>
);
}